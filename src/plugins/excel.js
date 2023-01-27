/* eslint-disable no-unreachable */
import flatten from 'flat'
import store from '../store/index.js'
import { MD5, enc } from 'crypto-js'

const unflatten = require('flat').unflatten

let ignoreEndsWithProps = ['totalChildrenCount']

let streamId, sheet, rowStart, colStart, arrayData, isTabularData, arrayIdData
let headerIndices = []

async function flattenData(item, signal) {
  if (signal.aborted) return
  if (Array.isArray(item)) {
    let localItems = [...item]
    const batchSize = 35
    while (localItems.length > 0) {
      let batch = localItems.splice(0, batchSize)
      await Promise.all(batch.map((i) => flattenSingle(i, signal)))
    }
  } else {
    await flattenSingle(item, signal)
  }
}

async function getReferencedObject(reference, signal) {
  if (signal.aborted) return

  let loader = await store.dispatch('getObject', {
    streamId: streamId,
    objectId: reference,
    options: {
      fullyTraverseArrays: false,
      excludeProps: ['displayValue', 'displayMesh', '__closure', 'elements']
    },
    signal
  })

  return await loader.getAndConstructObject()
}

async function flattenSingle(item, signal) {
  if (item.speckle_type && item.speckle_type == 'reference') {
    item = await getReferencedObject(item.referencedId, signal)
  }

  let flat = flatten(item)
  let rowData = []
  let rowIdData = []
  for (const [key, value] of Object.entries(flat)) {
    if (key === null || value === null) continue
    if (ignoreEndsWithProps.findIndex((x) => key.endsWith(x)) !== -1) continue
    // TODO: only capturing the first id to map objects between the viewer and the sheet.
    // there are probably many cases where this wouldn't be sufficient
    if (key == 'id') {
      let colIndex = arrayIdData[0].findIndex((x) => x === key)
      if (colIndex === -1) {
        colIndex = arrayIdData[0].length
        arrayIdData[0].push(key)
      }
      rowIdData[colIndex] = value
    } else {
      let colIndex = arrayData[0].findIndex((x) => x === key)
      if (colIndex === -1) {
        colIndex = arrayData[0].length
        arrayData[0].push(key)
      }
      rowData[colIndex] = value
    }
  }
  arrayData.push(rowData)
  arrayIdData.push(rowIdData)
}

//called if the received data does not contain objects => it's a table, a list or a single value
async function bakeArray(data, context) {
  //it's a single value
  if (!Array.isArray(data)) {
    let valueRange = sheet.getCell(rowStart, colStart)
    valueRange.values = data
  }
  //it's a flat list
  else if (!Array.isArray(data[0])) {
    let colIndex = 0
    for (let item of data) {
      let valueRange = sheet.getCell(rowStart, colIndex + colStart)
      valueRange.values = item
      colIndex++
    }
  }
  //it's a list of lists aka table
  else {
    let counter = 0
    let rowIndex = 0
    for (let array of data) {
      let colIndex = 0
      let actualColIndex = 0
      for (let item of array) {
        if (headerIndices.length === 0 || headerIndices.includes(colIndex)) {
          let valueRange = sheet.getCell(rowIndex + rowStart, actualColIndex + colStart)
          valueRange.values = Array.isArray(item) ? JSON.stringify(item) : item
          actualColIndex++
          counter++
        }
        colIndex++
        //sync in batches to avoid a RequestPayloadSizeLimitExceeded
        if (counter > 5000) {
          counter = 0
          await context.sync()
        }
      }

      rowIndex++
    }
  }
}

async function addIdDataToObjectData() {
  if (arrayData.length != arrayIdData.length) {
    console.log('Could not attach object ids to table')
    return
  }

  var previousLastIndex = arrayData[0].length - 1
  for (let i = 0; i < arrayIdData.length; i++) {
    arrayData[i].push(...arrayIdData[i])
  }
  for (let i = 0; i < arrayIdData[0].length; i++) {
    headerIndices.push(previousLastIndex + 1 + i)
  }

  // await window.Excel.run(async (context) => {
  //   console.log('names')
  //   const names = context.workbook.names
  //   console.log('names', names)
  //   const range = names.getItem('rrr').getRange()
  //   range.load('address')
  //   names.load('items')
  //   await context.sync()

  //   console.log('names', names.items)
  //   console.log(range.address)
  //   console.log('myNamedItem', range)
  // })
  // for (var header in arrayData[0]) {
  //   console.log('header', header)
  // }
}

function headerListToTree(headers) {
  let tree = [{ id: 0, name: 'all fields', fullname: '', children: [] }]
  let i = 1
  for (let header of headers) {
    var parts = header.split('.')
    let leaf = tree[0].children
    let partIndex = 1
    for (let part of parts) {
      let index = leaf.findIndex((x) => x.name === part)
      if (index === -1) {
        let fullname = parts.slice(0, partIndex).join('.')
        leaf.push({ id: i, name: part, fullname: fullname, children: [] })
        index = leaf.length - 1
        i++
      }
      partIndex++
      leaf = leaf[index].children
    }
  }
  return tree
}

//recursively goes through data to check if it contains objects
//guess it could be improved
function hasObjects(data) {
  if (!Array.isArray(data) && typeof data === 'object') return true

  if (Array.isArray(data)) {
    for (let item of data) {
      if (hasObjects(item)) return true
    }
  }
  return false
}

export async function receiveLatest(
  reference,
  _streamId,
  _commitId,
  _commitMsg,
  receiverSelection,
  signal
) {
  try {
    //TODO: only get objs that are needed?
    streamId = _streamId
    let item = await getReferencedObject(reference, signal)
    let parts = receiverSelection.fullKeyName.split('.')
    //picks the sub-object on which the user previously clicked `bake`
    for (let part of parts) {
      item = item[part]
    }

    await bake(
      item,
      _streamId,
      _commitId,
      _commitMsg,
      null,
      signal,
      receiverSelection.headers,
      receiverSelection.range
    )
  } catch (e) {
    //pokemon
    console.log(e)
    store.dispatch('showSnackbar', {
      message: 'Could not match the previous data structure',
      color: 'error'
    })
  }
}
export async function bake(
  data,
  _streamId,
  _commitId,
  _commitMsg,
  modal,
  signal,
  previousHeaders,
  previousRange
) {
  try {
    let address, range
    let selectedHeaders = previousHeaders

    await window.Excel.run(async (context) => {
      if (previousRange) {
        let sheetName = previousRange.split('!')[0].replace(/'/g, '')
        let rangeAddress = previousRange.split('!')[1]
        sheet = context.workbook.worksheets.getItem(sheetName)
        range = sheet.getRange(rangeAddress)
      } else {
        range = context.workbook.getSelectedRange()
      }
      range.load('address, worksheet, columnIndex, rowIndex')
      await context.sync()

      sheet = range.worksheet
      sheet.load('items/name')

      address = range.address
      rowStart = range.rowIndex
      colStart = range.columnIndex

      streamId = _streamId
      arrayData = [[]]
      arrayIdData = [[]]
      headerIndices = []

      //if the incoming data has objects we need to flatten them to an array
      //otherwise we just output it
      isTabularData = true

      if (signal.aborted) return
      if (hasObjects(data, signal)) {
        isTabularData = false
        await flattenData(data, signal)
        //transpose 2d array, sort alphabetically, then transpose again
        //this helps ensure the order of the baked columns is the same across streams
        arrayData = arrayData[0].map((_, colIndex) => arrayData.map((row) => row[colIndex]))
        arrayData = arrayData.sort((a, b) => (a[0] > b[0] ? 1 : -1))
        arrayData = arrayData[0].map((_, colIndex) => arrayData.map((row) => row[colIndex]))
      } else arrayData = data

      if (signal.aborted) return

      if (!isTabularData && arrayData[0].length > 25) {
        //it's manual run
        if (!previousHeaders && modal) {
          let headers = headerListToTree(arrayData[0], signal)
          let dialog = await modal.open(
            headers,
            `You are about to receive ${arrayData[0].length} columns and ${arrayData.length} rows, you can filter them below.`
          )
          console.log(dialog)
          if (!dialog.result) {
            store.dispatch('showSnackbar', {
              message: 'Operation cancelled'
            })
            return
          }
          if (arrayData[0].length !== dialog.items.length) {
            selectedHeaders = dialog.items
            //construct a list of the index of each header to include
            for (let item of selectedHeaders) headerIndices.push(arrayData[0].indexOf(item))
          }
        } else if (previousHeaders) {
          for (let item of previousHeaders) {
            let index = arrayData[0].indexOf(item)
            if (index !== -1) headerIndices.push(index)
          }
        }
      }

      if (signal.aborted) return

      addIdDataToObjectData()
      await bakeArray(arrayData, context)
      await context.sync()

      await store.dispatch('receiveCommit', {
        sourceApplication: 'Excel',
        streamId: _streamId,
        commitId: _commitId,
        message: _commitMsg
      })

      store.dispatch('showSnackbar', {
        message: 'Data received successfully'
      })
    })

    let receiverSelection = { headers: selectedHeaders, range: address }

    return receiverSelection
    // eslint-disable-next-line no-unreachable
  } catch (e) {
    //pokemon
    console.log(e)

    let m = 'Something went wrong: ' + e
    if (e.name !== 'AbortError') m = 'Operation cancelled'

    store.dispatch('showSnackbar', {
      message: m,
      color: 'error'
    })
  }
}

export async function send(savedStream, streamId, branchName, message) {
  try {
    await window.Excel.run(async (context) => {
      let sheetName = savedStream.selection.split('!')[0].replace(/'/g, '')
      let rangeAddress = savedStream.selection.split('!')[1]
      let sheet = context.workbook.worksheets.getItem(sheetName)

      let range = sheet.getRange(rangeAddress)
      range.load('values')
      await context.sync()
      let values = range.values

      let data = []
      if (savedStream.hasHeaders) {
        for (let row = 1; row < values.length; row++) {
          let object = {}
          for (let col = 0; col < values[0].length; col++) {
            let propName = values[0][col]
            //if (propName !== 'id' && propName.endsWith('.id')) continue
            let propValue = values[row][col]
            object[propName] = propValue
          }
          // generate a hash if none is present
          object.id = object.id || MD5(JSON.stringify(object)).toString(enc.Hex)
          let unlattened = unflatten(object)
          data.push(unlattened)
        }
      } else {
        for (let row = 0; row < values.length; row++) {
          let rowArray = []
          for (let col = 0; col < values[0].length; col++) {
            rowArray.push(values[row][col])
          }
          data.push(rowArray)
        }
      }

      await store.dispatch('createCommit', {
        object: data,
        streamId: streamId,
        branchName: branchName,
        message: message
      })

      store.dispatch('showSnackbar', {
        message: 'Data sent successfully'
      })
    })
  } catch (e) {
    //pokemon
    console.log(e)
    let m = 'Something went wrong: ' + e
    if (e.name !== 'AbortError') m = 'Operation cancelled'

    store.dispatch('showSnackbar', {
      message: m,
      color: 'error'
    })
  }
}

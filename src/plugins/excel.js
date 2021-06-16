/* eslint-disable no-unreachable */
import flatten from 'flat'
import store from '../store/index.js'

const unflatten = require('flat').unflatten

let ignoreEndsWithProps = ['id', 'totalChildrenCount']

let streamId, sheet, rowStart, colStart, arrayData, isTabularData
let headerIndices = []

async function flattenData(item) {
  if (Array.isArray(item)) {
    for (let o of item) {
      await flattenSingle(o)
    }
  } else {
    await flattenSingle(item)
  }
}

async function getReferencedObject(reference) {
  let loader = await store.dispatch('getObject', {
    streamId: streamId,
    objectId: reference,
    options: {
      fullyTraverseArrays: false,
      excludeProps: ['displayValue', 'displayMesh', '__closure', 'elements']
    }
  })

  return await loader.getAndConstructObject()
}

async function flattenSingle(item) {
  if (item.speckle_type && item.speckle_type == 'reference') {
    item = await getReferencedObject(item.referencedId)
  }

  let flat = flatten(item)
  let rowData = []
  for (const [key, value] of Object.entries(flat)) {
    if (ignoreEndsWithProps.findIndex((x) => key.endsWith(x)) !== -1) continue

    let colIndex = arrayData[0].findIndex((x) => x === key)
    if (colIndex === -1) {
      colIndex = arrayData[0].length
      arrayData[0].push(key)
    }
    rowData[colIndex] = value
  }
  arrayData.push(rowData)
}

//called if the received data does not contain objects => it's a table, a list or a single value
async function bakeArray(data) {
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
    let rowIndex = 0
    for (let array of data) {
      let colIndex = 0
      let actualColIndex = 0
      for (let item of array) {
        if (headerIndices.length === 0 || headerIndices.includes(colIndex)) {
          let valueRange = sheet.getCell(rowIndex + rowStart, actualColIndex + colStart)
          valueRange.values = Array.isArray(item) ? JSON.stringify(item) : item
          actualColIndex++
        }
        colIndex++
      }
      rowIndex++
    }
  }
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

export async function receiveLatest(reference, _streamId, receiverSelection) {
  try {
    //TODO: only get objs that are needed?
    streamId = _streamId
    let item = await getReferencedObject(reference)
    let parts = receiverSelection.fullKeyName.split('.')
    //picks the sub-object on which the user previously clicked `bake`
    for (let part of parts) {
      item = item[part]
    }

    await bake(item, _streamId, null, receiverSelection.headers, receiverSelection.range)
  } catch (e) {
    //pokemon
    console.log(e)
    store.dispatch('showSnackbar', {
      message: 'Could not match the previous data structure',
      color: 'error'
    })
  }
}
export async function bake(data, _streamId, modal, previousHeaders, previousRange) {
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
      headerIndices = []

      //if the incoming data has objects we need to flatten them to an array
      //otherwise we just output it
      isTabularData = true
      if (hasObjects(data)) {
        isTabularData = false
        await flattenData(data)
        //transpose 2d array, sort alphabetically, then transpose again
        //this helps ensure the order of the baked columns is the same across streams
        arrayData = arrayData[0].map((_, colIndex) => arrayData.map((row) => row[colIndex]))
        arrayData = arrayData.sort((a, b) => (a[0] > b[0] ? 1 : -1))
        arrayData = arrayData[0].map((_, colIndex) => arrayData.map((row) => row[colIndex]))
      } else arrayData = data

      if (!isTabularData && arrayData[0].length > 25) {
        //it's manual run
        if (!previousHeaders) {
          let headers = headerListToTree(arrayData[0])
          let dialog = await modal.open(
            headers,
            `You are about to receive ${arrayData[0].length} columns and ${arrayData.length} rows, you can filter them below.`
          )
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
        } else {
          for (let item of previousHeaders) {
            let index = arrayData[0].indexOf(item)
            if (index !== -1) headerIndices.push(index)
          }
        }
      }

      await bakeArray(arrayData)
      await context.sync()
    })
    window._paq.push(['setCustomUrl', 'http://connectors/Excel/receive'])
    window._paq.push(['trackPageView', 'receive'])

    store.dispatch('showSnackbar', {
      message: 'Data received successfully'
    })
    let receiverSelection = { headers: selectedHeaders, range: address }
    return receiverSelection
    // eslint-disable-next-line no-unreachable
  } catch (e) {
    //pokemon
    console.log(e)
    store.dispatch('showSnackbar', {
      message: 'Something went wrong: ' + e,
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

      window._paq.push(['setCustomUrl', 'http://connectors/Excel/send'])
      window._paq.push(['trackPageView', 'send'])

      store.dispatch('showSnackbar', {
        message: 'Data sent successfully'
      })
    })
  } catch (e) {
    //pokemon
    console.log(e)
    store.dispatch('showSnackbar', {
      message: 'Something went wrong: ' + e,
      color: 'error'
    })
  }
}

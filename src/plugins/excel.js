/* eslint-disable no-unreachable */
import flatten from 'flat'
import store from '../store/index.js'

const unflatten = require('flat').unflatten

let ignoreEndsWithProps = ['id', 'totalChildrenCount']

let streamId, sheet, rowStart, colStart, arrayData, headerIndices

async function flattenData(item) {
  if (Array.isArray(item)) {
    for (let o of item) {
      await flattenSingle(o)
    }
  } else {
    await flattenSingle(item)
  }
}

async function flattenSingle(item) {
  if (item.speckle_type && item.speckle_type == 'reference') {
    let loader = await store.dispatch('getObject', {
      streamId: streamId,
      objectId: item.referencedId,
      options: {
        fullyTraverseArrays: false,
        excludeProps: ['displayValue', 'displayMesh', '__closure', 'elements']
      }
    })

    item = await loader.getAndConstructObject()
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

export async function bake(data, _streamId, modal) {
  try {
    await window.Excel.run(async (context) => {
      let range = context.workbook.getSelectedRange()
      range.load('address, worksheet, columnIndex, rowIndex')

      await context.sync()

      sheet = range.worksheet
      sheet.load('items/name')

      rowStart = range.rowIndex
      colStart = range.columnIndex

      streamId = _streamId
      arrayData = [[]]
      headerIndices = []

      //if the incoming data has objects we need to flatten them to an array
      //otherwise we just output it
      let isTabularData = true
      if (hasObjects(data)) {
        isTabularData = false
        await flattenData(data)
      } else arrayData = data

      if (!isTabularData && arrayData[0].length > 25) {
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
        //construct a list of the index of each header to include
        for (let item of dialog.items) headerIndices.push(arrayData[0].indexOf(item))
      }

      await bakeArray(arrayData)
      await context.sync()

      store.dispatch('showSnackbar', {
        message: 'Data received successfully'
      })
    })
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
      let sheet = context.workbook.worksheets.getItem(savedStream.selection.split('!')[0])
      let range = sheet.getRange(savedStream.selection)
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

import flatten from 'flat'
import store from '../store/index.js'

const unflatten = require('flat').unflatten

let rowIndex = 1
let ignoredProps = ['id', 'reference', 'totalChildrenCount']
let headers = []
let streamId, sheet, rowStart, colStart

async function bakeObject(item) {
  if (Array.isArray(item)) {
    for (let o of item) {
      await bakeObject(o)
    }
  } else if (item.speckle_type && item.speckle_type == 'reference') {
    let loader = await store.dispatch('getObject', {
      streamId: streamId,
      objectId: item.referencedId
    })

    for await (let o of loader.getObjectIterator()) {
      if (o.totalChildrenCount > 0) continue

      await bakeObject(o)
    }
  } else {
    let flat = flatten(item)

    for (const [key, value] of Object.entries(flat)) {
      if (ignoredProps.includes(key)) continue

      let colIndex = headers.findIndex((x) => x === key)
      if (colIndex === -1) {
        colIndex = headers.length
        let keyRange = sheet.getCell(rowStart, colIndex + colStart)
        keyRange.values = key
        headers.push(key)
      }

      let valueRange = sheet.getCell(rowIndex + rowStart, colIndex + colStart)
      valueRange.values = value
    }
    rowIndex++
  }
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
  //it's a list of lists
  else {
    rowIndex = 0
    for (let array of data) {
      let colIndex = 0
      for (let item of array) {
        let valueRange = sheet.getCell(rowIndex + rowStart, colIndex + colStart)
        valueRange.values = item
        colIndex++
      }
      rowIndex++
    }
  }
}

//recursively goes through data to check if it contains objects
function hasObjects(data) {
  if (!Array.isArray(data) && typeof data === 'object') return true

  if (Array.isArray(data)) {
    for (let item of data) {
      if (hasObjects(item)) return true
    }
  }
  return false
}

export async function bake(data, _streamId) {
  try {
    await window.Excel.run(async (context) => {
      let range = context.workbook.getSelectedRange()
      range.load('address, worksheet, columnIndex, rowIndex')

      await context.sync()

      sheet = range.worksheet
      sheet.load('items/name')

      rowStart = range.rowIndex
      colStart = range.columnIndex

      rowIndex = 1
      headers = []
      streamId = _streamId

      if (hasObjects(data)) await bakeObject(data)
      else await bakeArray(data)

      await context.sync()
    })
    store.dispatch('showSnackbar', {
      message: 'Data received successfully'
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
            if (propName !== 'id' && propName.endsWith('.id')) continue
            let propValue = values[row][col]
            object[propName] = propValue
          }
          let unlattened = unflatten(object, { object: true })

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

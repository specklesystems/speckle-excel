/* eslint-disable no-unreachable */
import flatten from 'flat'
import store from '../store/index.js'
import { MD5, enc } from 'crypto-js'
import {
  checkIfReceivingDataTable,
  getDataTableContainingRange,
  bakeDataTable,
  formatArrayDataForTable,
  BuildDataTableObject,
  onTableChanged,
  onTableDeleted
} from './dataTable.js'

const unflatten = require('flat').unflatten

let ignoreEndsWithProps = ['totalChildrenCount', 'elements']

let streamId, sheet, rowStart, colStart, arrayData, isTabularData, arrayIdData

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

export async function getReferencedObject(
  streamId,
  reference,
  signal,
  excludeElementsFromConstruction = true
) {
  if (signal.aborted) return

  let excludeProps = ['displayValue', 'displayMesh', '__closure']
  if (excludeElementsFromConstruction) excludeProps.push('elements')

  let loader = await store.dispatch('getObject', {
    streamId: streamId,
    objectId: reference,
    options: {
      fullyTraverseArrays: false,
      excludeProps: excludeProps
    },
    signal
  })

  return await loader.getAndConstructObject()
}

async function flattenSingle(item, signal) {
  if (item.speckle_type && item.speckle_type == 'reference') {
    item = await getReferencedObject(streamId, item.referencedId, signal)
  }

  let flat = flatten(item)
  let rowData = []
  let rowIdData = ''
  for (const [key, value] of Object.entries(flat)) {
    if (key === null || value === null) continue
    if (ignoreEndsWithProps.findIndex((x) => key.endsWith(x)) !== -1) continue
    // TODO: we don't need to capture EVERY id like I'm doing here...
    if (key.endsWith('id')) {
      rowIdData += value + ','
    }
    let colIndex = arrayData[0].findIndex((x) => x === key)
    if (colIndex === -1) {
      colIndex = arrayData[0].length
      arrayData[0].push(key)
    }
    rowData[colIndex] = Array.isArray(value) ? JSON.stringify(value) : value
  }
  arrayData.push(rowData)
  arrayIdData.push(rowIdData)
}

//called if the received data does not contain objects => it's a table, a list or a single value
export async function bakeArray(data, context) {
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
  // it's a list of lists aka table
  else {
    let rowIndex = 0
    let batchSize = 50
    while (rowIndex < data.length) {
      let dataBatch = data.slice(rowIndex, rowIndex + batchSize)
      let numRows = dataBatch.length
      let rangeAddress = getRangeAddressFromIndicies(
        rowStart + rowIndex,
        colStart,
        rowStart + rowIndex + numRows - 1,
        colStart + data[0].length - 1
      )
      let valueRange = sheet.getRange(rangeAddress)
      valueRange.values = dataBatch
      rowIndex += numRows
      await context.sync()
    }
  }
}

export async function bakeTable(data, context, sheet, name, rowStart, colStart, headerRowIndex) {
  let rowIndex = 0
  let batchSize = 50
  while (rowIndex < data.length) {
    let dataBatch = data.slice(rowIndex, rowIndex + batchSize)
    let numRows = dataBatch.length
    let rangeAddress = getRangeAddressFromIndicies(
      rowStart + headerRowIndex + rowIndex,
      colStart,
      rowStart + headerRowIndex + rowIndex + numRows - 1,
      colStart + data[0].length - 1
    )
    let valueRange = sheet.getRange(rangeAddress)
    valueRange.values = dataBatch
    rowIndex += numRows
    await context.sync()
  }

  let totalRangeAddress = getRangeAddressFromIndicies(
    rowStart + headerRowIndex,
    colStart,
    rowStart + headerRowIndex + data.length - 1,
    colStart + data[0].length - 1
  )

  sheet.activate()
  let table = sheet.tables.add(totalRangeAddress, true)
  table.load('id')
  await context.sync()

  let tableId = removeNonAlphanumericCharacters(table.id)
  let columnMetaAddress = getRangeAddressFromIndicies(
    rowStart,
    colStart + 1,
    rowStart,
    colStart + data[0].length - 1
  )
  let columnMetaRange = sheet.getRange(columnMetaAddress)
  let rowMetaAddress = getRangeAddressFromIndicies(
    rowStart,
    colStart,
    rowStart + headerRowIndex + rowIndex - 1,
    colStart
  )
  let rowMetaRange = sheet.getRange(rowMetaAddress)

  sheet.names.add(`speckleColumnMetadata_${tableId}`, columnMetaRange)
  sheet.names.add(`speckleRowMetadata_${tableId}`, rowMetaRange)
  context.workbook.tables.onDeleted.add(onTableDeleted)
  context.workbook.tables.onChanged.add(onTableChanged)

  await context.sync()
}

export function removeNonAlphanumericCharacters(s) {
  return s.replace(/\W/g, '')
}

export function hideRowOrColumn(sheet, columnIndex = -1, rowIndex = -1) {
  if (columnIndex > -1) {
    let columnLetter = numberToLetters(columnIndex)
    sheet.getRange(`${columnLetter}:${columnLetter}`).columnHidden = true
  }
  if (rowIndex > -1) {
    let rowRange = sheet.getRange(`${rowIndex + 1}:${rowIndex + 1}`)
    rowRange.rowHidden = true
    rowRange.format.wrapText = true
  }
}

async function addIdDataToObjectData() {
  if (arrayData.length != arrayIdData.length) {
    console.log('Could not attach object ids to table')
    return
  }
  for (let i = 0; i < arrayData.length; i++) {
    arrayData[i].push(arrayIdData[i])
    // push an empty space at the end of each array because it will trim the overflow from the
    // speckleIds in the previous column
    arrayData[i].push(' ')
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

async function constructRefObjectData(data, nearestObjectId, pathFromNearestObj, signal) {
  if (!Array.isArray(data)) {
    if (data.speckle_type == 'reference') {
      return await getReferencedObject(streamId, data.referencedId, signal)
    }
    return data
  }

  if (!nearestObjectId) return data

  const refIndex = data.findIndex((o) => o.speckle_type === 'reference')

  // no referenced Ids, objects are already constructed
  if (refIndex == -1) return data

  var parent = await getReferencedObject(
    streamId,
    nearestObjectId,
    signal,
    !pathFromNearestObj.toLowerCase().includes('elements')
  )
  if (signal.aborted) return data

  const delimiter = ':::'
  var pathArray = pathFromNearestObj.split(delimiter)
  for (let i = 0; i < pathArray.length; i++) {
    if (!pathArray[i]) continue
    parent = parent[pathArray[i]]
  }
  if (
    Array.isArray(parent) &&
    data.length == parent.length &&
    data[refIndex].referencedId == parent[refIndex].id
  ) {
    return parent
  }
  //TODO: add logging here. If this line is reached then I'm pretty sure I did the traversal logic wrong
  return data
}

// this function is brought to you by chatGPT
// it takes in an excel column index and outputs the column string
// 0 -> A
// 1 -> B
// ...
// 26 -> AA
// 27 -> AB
// ...
function numberToLetters(number) {
  const base = 26
  let letters = ''
  do {
    const remainder = number % base
    letters = String.fromCharCode(65 + remainder) + letters
    number = Math.floor(number / base) - 1
  } while (number >= 0)
  return letters
}

// this function is also the intellectual property of chatGPT
// it does the opposite of the numberToLetters function
// A -> 0
// B -> 1
// ...
// AA -> 26
// ...
function lettersToNumber(letters) {
  const base = 26
  let number = 0
  for (let i = 0; i < letters.length; i++) {
    const charCode = letters.charCodeAt(i) - 65 + 1
    number = number * base + charCode
  }
  return number - 1
}

export function getRangeAddressFromIndicies(startRow, startCol, endRow, endCol) {
  let range = ''

  range += numberToLetters(startCol) + String(startRow + 1)
  range += ':'
  range += numberToLetters(endCol) + String(endRow + 1)

  return range
}

export function getIndiciesFromRangeAddress(address) {
  let parts = address.match(/[a-zA-Z]+|[0-9]+/g)

  // if the sheet is part of the address, then get rid of it
  if (parts[0] === 'Sheet') parts.splice(0, 2)

  let output = []
  for (let part of parts) {
    let numValue = parseInt(part)
    if (numValue) numValue -= 1
    else numValue = lettersToNumber(part)
    output.push(numValue)
  }

  if (output.length == 2) {
    output[2] = output[0]
    output[3] = output[1]
  }

  return output
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
    let item = await getReferencedObject(streamId, reference, signal)
    let parts = receiverSelection.fullKeyName.split('.')
    //picks the sub-object on which the user previously clicked `bake`
    for (let part of parts) {
      item = item[part]
    }

    if (!item) {
      store.dispatch('showSnackbar', {
        message: 'Could not match the previous data structure',
        color: 'error'
      })
      return
    }

    await bake(
      item,
      _streamId,
      _commitId,
      _commitMsg,
      null,
      signal,
      null,
      null,
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
async function getAddress(_streamId, signal, previousRange, context) {
  let address, range
  // await window.Excel.run(async (context) => {
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
  // })

  sheet = range.worksheet
  sheet.load('items/name')

  address = range.address
  rowStart = range.rowIndex
  colStart = range.columnIndex

  streamId = _streamId
  arrayData = [[]]
  arrayIdData = ['speckleIDs']

  //if the incoming data has objects we need to flatten them to an array
  //otherwise we just output it
  isTabularData = true

  if (signal.aborted) return

  return address
}
export async function bakeSchedule(
  data,
  _streamId,
  _commitId,
  _commitMsg,
  signal,
  nearestObjectId,
  pathFromNearestObj,
  previousHeaders,
  previousRange
) {
  try {
    let selectedHeaders = previousHeaders
    let address
    await window.Excel.run(async (context) => {
      address = await getAddress(_streamId, signal, previousRange, context)
      data = await constructRefObjectData(data, nearestObjectId, pathFromNearestObj, signal)

      let schedulePaths = []
      let flat = flatten(data, { maxDepth: 4 })

      for (const [key, value] of Object.entries(flat)) {
        if (key.endsWith('speckle_type') && value.endsWith('DataTable')) {
          schedulePaths.push(
            key.replace('.speckle_type', '').replace('speckle_type', '').split('.')
          )
        }
      }

      for (let i = 0; i < schedulePaths.length; i++) {
        if (i != 0) {
          context.workbook.worksheets.add()
          sheet = context.workbook.worksheets.items[-1]
        }
        try {
          let filteredData = { ...data }
          schedulePaths[i].forEach((step) => {
            if (step) {
              filteredData = filteredData[step]
            }
          })
          if (signal.aborted) return

          formatArrayDataForTable(filteredData, arrayData)

          if (signal.aborted) return
          await bakeDataTable(filteredData, arrayData, context, sheet, rowStart, colStart)
        } catch (e) {
          console.log(e)
        }
      }

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
export async function bake(
  data,
  _streamId,
  _commitId,
  _commitMsg,
  modal,
  signal,
  nearestObjectId,
  pathFromNearestObj,
  previousHeaders,
  previousRange
) {
  try {
    let selectedHeaders = previousHeaders
    let address
    await window.Excel.run(async (context) => {
      address = getAddress(_streamId, signal, previousRange, context)
      data = await constructRefObjectData(data, nearestObjectId, pathFromNearestObj, signal)

      if (signal.aborted) return
      // check for specific conversions
      if (checkIfReceivingDataTable(data)) {
        formatArrayDataForTable(data, arrayData)
        await bakeDataTable(data, arrayData, context, sheet, rowStart, colStart)
      } else {
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
          let filteredData = [[]]
          // initialize filteredData array with empty arrays
          for (let i = 0; i < arrayData.length; i++) {
            filteredData[i] = []
          }
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

              for (let item of selectedHeaders) {
                let index = arrayData[0].indexOf(item)
                if (index === -1) continue

                for (let i = 0; i < arrayData.length; i++) {
                  filteredData[i].push(arrayData[i][index])
                }
              }
            }
          } else if (previousHeaders) {
            for (let item of previousHeaders) {
              let index = arrayData[0].indexOf(item)
              if (index === -1) continue

              for (let i = 0; i < arrayData.length; i++) {
                filteredData[i].push(arrayData[i][index])
              }
            }
          }

          arrayData = filteredData
        }

        if (signal.aborted) return

        addIdDataToObjectData()
        await bakeArray(arrayData, context)
      }

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

// eslint-disable-next-line no-unused-vars
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
      // check for specific conversion
      let table = await getDataTableContainingRange(range, values, sheet, context)
      if (table) {
        data = await BuildDataTableObject(range, values, table, sheet, context)
      } else {
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

        data = { data: data, speckle_type: 'Base' }
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

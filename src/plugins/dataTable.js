// eslint-disable-next-line no-unused-vars
import { bakeTable, bakeArray, hideRowOrColumn, getIndiciesFromRangeAddress, send } from './excel'
export const tableName = 'SpeckleDataTable'

export function checkIfReceivingDataTable(item) {
  if (!(item.speckle_type && item.speckle_type.split('.').at(-1) == 'DataTable')) {
    return false
  }
  return true
}

export function formatArrayDataForTable(item, arrayData) {
  arrayData[0].push('SpeckleColumnMetadataRow')
  for (let i = 0; i < item.columnCount; i++) {
    arrayData[0].push(JSON.stringify(item.columnMetadata[i]))
  }

  for (let i = 0; i < item.rowCount; i++) {
    let row = []
    row.push(JSON.stringify(item.rowMetadata[i]))
    row.push(...item.data[i])
    arrayData.push(row)
  }
}

export async function bakeDataTable(item, arrayData, context, sheet, rowStart, colStart) {
  // add one to headerRowIndex because we've added the column metadata as a new first row
  let headerRowIndex = 1
  if (item.headerRowIndex) {
    headerRowIndex = item.headerRowIndex + 1
  }
  let name = 'DataTable'
  if (item.name) {
    name = item.name
  }
  // hideRowOrColumn(sheet, colStart)
  await bakeArray(arrayData.splice(0, headerRowIndex), context)

  // set table applicationId in the top left cell
  arrayData[0][0] = `{"SpeckleTableApplicationId":"${item.applicationId}"}`
  await bakeTable(arrayData, context, sheet, name, rowStart + headerRowIndex, colStart)
  // hideRowOrColumn(sheet, colStart, rowStart)
}

export async function getDataTableContainingRange(range, values, sheet, context) {
  let selectedTable = null
  sheet.tables.load('count')
  await context.sync()

  for (let i = 0; i < sheet.tables.count; i++) {
    let tableRange = sheet.tables.getItemAt(i).getRange()
    let intersectionRange = tableRange.getIntersectionOrNullObject(range)
    await context.sync()
    if (intersectionRange.isNullObject) {
      continue
    }

    range.load('columnCount, rowCount')
    intersectionRange.load('columnCount, rowCount')
    await context.sync()
    if (
      intersectionRange.columnCount >= range.columnCount &&
      intersectionRange.rowCount >= range.rowCount
    ) {
      selectedTable = sheet.tables.getItemAt(i)
      break
    }
  }

  const isDataTable = await isSpeckleDataTable(selectedTable, sheet, context)
  if (selectedTable && isDataTable) {
    return selectedTable
  }

  return null
}

async function isSpeckleDataTable(table, sheet, context) {
  let tableRange = table.getRange()
  tableRange.load('rowIndex, columnIndex')
  await context.sync()
  // let tableRangeAddress = tableRange.address
  // let rangeIndicies = getIndiciesFromRangeAddress(tableRangeAddress)
  // let firstCellRange = sheet.getRangeByIndexes(rangeIndicies[1], rangeIndicies[0], 1, 1)
  let firstCellRange = sheet.getRangeByIndexes(tableRange.rowIndex, tableRange.columnIndex, 1, 1)

  firstCellRange.load('values')
  await context.sync()

  if (firstCellRange.values[0][0].includes('SpeckleTableApplicationId')) {
    return true
  }
  return false
}

export async function BuildDataTableObject(sendingRange, values, table, sheet, context) {
  let metaRowIndex = await GetColumnMetadataRowIndex(table, sheet, context)
  let metaColIndex = await GetRowMetadataColumnIndex(table, context)

  let speckleTable = new DataTable()
  sendingRange.load('rowIndex, columnIndex, rowCount, columnCount')
  await context.sync()

  let metaRowRange = sheet.getRangeByIndexes(
    metaRowIndex,
    sendingRange.columnIndex,
    1,
    sendingRange.columnCount
  )
  let metaColumnRange = sheet.getRangeByIndexes(
    sendingRange.rowIndex,
    metaColIndex,
    sendingRange.rowCount,
    1
  )

  metaRowRange.load('values')
  metaColumnRange.load('values')
  await context.sync()

  for (let i = 0; i < sendingRange.columnCount; i++) {
    speckleTable.defineColumn(JSON.parse(metaRowRange.values[0][i]))
  }

  for (let i = 0; i < sendingRange.rowCount; i++) {
    speckleTable.addRow(JSON.parse(metaColumnRange.values[i][0]), values[i])
  }

  return speckleTable
}

export async function GetColumnMetadataRowIndex(table, sheet, context) {
  let tableRange = table.getRange()
  tableRange.load('columnIndex, rowCount, rowIndex')
  await context.sync()

  // let tableRangeAddress = tableRange.address
  // let rangeIndicies = getIndiciesFromRangeAddress(tableRangeAddress)
  // let firstCellRange = sheet.getRangeByIndexes(rangeIndicies[1], rangeIndicies[0], 1, 1)
  console.log('hey')
  let bottomRowCell = sheet.getRangeByIndexes(
    tableRange.rowIndex + tableRange.rowCount - 1,
    tableRange.columnIndex,
    1,
    1
  )

  const extendedRange = tableRange.getExtendedRange(
    window.Excel.KeyboardDirection.up,
    bottomRowCell
  )
  extendedRange.load('columnCount, columnIndex, rowCount, rowIndex')
  await context.sync()

  let possibleMetadataRowRange = sheet.getRangeByIndexes(
    extendedRange.rowIndex,
    extendedRange.columnIndex,
    extendedRange.rowCount - tableRange.rowCount,
    extendedRange.columnCount
  )

  var found = possibleMetadataRowRange.findOrNullObject('SpeckleColumnMetadataRow', {
    completeMatch: false, // Match the whole cell value.
    matchCase: true, // Don't match case.
    searchDirection: window.Excel.SearchDirection.forward // Start search at the beginning of the range.
  })
  found.load('rowIndex')
  await context.sync()
  if (found.isNullObject) {
    found = possibleMetadataRowRange.findOrNullObject('speckle_type', {
      completeMatch: false, // Match the whole cell value.
      matchCase: true, // Match case.
      searchDirection: window.Excel.SearchDirection.forward // Start search at the beginning of the range.
    })
    found.load('rowIndex')
    await context.sync()
  }

  if (found.isNullObject) {
    throw new Error('Could not find column metadata')
  }

  return found.rowIndex
}

export async function GetRowMetadataColumnIndex(table, context) {
  let tableRange = table.getRange()
  tableRange.load('columnIndex, rowCount, rowIndex')
  await context.sync()

  return tableRange.columnIndex
}

class Base {
  id
  totalChildrenCount
  applicationId
}

export class DataTable extends Base {
  get columnCount() {
    return this.columnMetadata.length
  }
  get rowCount() {
    return this.rowMetadata.length
  }
  // eslint-disable-next-line camelcase
  get speckle_type() {
    return 'Objects.Organization.DataTable'
  }
  headerRowIndex
  columnMetadata = []
  rowMetadata = []
  data = []

  addRow(metadata, objects) {
    if (objects.length != this.columnCount)
      throw new Error(
        `object length of ${objects.length} does not match the column count, ${this.columnCount}`
      )
    this.rowMetadata.push(metadata)
    this.data.push(objects)
  }

  defineColumn(metadata) {
    this.columnMetadata.push(metadata)
  }

  toJSON() {
    const jsonObj = Object.assign({}, this)
    const proto = Object.getPrototypeOf(this)
    for (const key of Object.getOwnPropertyNames(proto)) {
      const desc = Object.getOwnPropertyDescriptor(proto, key)
      const hasGetter = desc && typeof desc.get === 'function'
      if (hasGetter) {
        jsonObj[key] = this[key]
      }
    }
    return jsonObj
  }
}

// export function checkIfSendingDataTable(item, arrayData) {

// }

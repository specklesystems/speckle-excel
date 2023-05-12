// eslint-disable-next-line no-unused-vars
import {
  bakeTable,
  bakeArray,
  hideRowOrColumn,
  removeNonAlphanumericCharacters,
  getIndiciesFromRangeAddress
} from './excel'
export const tableName = 'SpeckleDataTable'

export function checkIfReceivingDataTable(item) {
  if (!Array.isArray(item)) {
    return checkIfSingleDataTable(item)
  }

  if (item.length < 1) {
    return false
  }

  //it's a flat list
  else if (!Array.isArray(item[0])) {
    return checkIfSingleDataTable(item[0])
  }
}

function checkIfSingleDataTable(item) {
  if (!(item.speckle_type && item.speckle_type.split('.').at(-1) == 'DataTable')) {
    return false
  }
  return true
}

export function formatArrayDataForTable(item, arrayData) {
  // TODO: support receiving multiple tables
  if (Array.isArray(item)) {
    item = item[0]
  }

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
  // TODO: support receiving multiple tables
  if (Array.isArray(item)) {
    item = item[0]
  }

  var tableToUpdate = await getExistingTableInLocation(context, sheet, rowStart, colStart)
  if (tableToUpdate) {
    let existingAppId = await getSpeckleIdFromTable(tableToUpdate, sheet, context)
    if (existingAppId != item.applicationId) {
      throw new Error('Trying receive a datatable where a different datatable already exists')
    }

    let indicies = await getMetadataIndex(tableToUpdate, sheet, context)
    if (indicies[0] != -1 && indicies[1] != -1) {
      rowStart = indicies[0]
      colStart = indicies[1]

      await cleanUpTableMetadata(tableToUpdate.id, context)
      tableToUpdate.delete()
    }
  }

  // add one to headerRowIndex because we've added the column metadata as a new first row
  let headerRowIndex = 1
  if (item.headerRowIndex) {
    headerRowIndex = item.headerRowIndex + 1
  }
  let name = 'DataTable'
  if (item.name) {
    name = item.name
  }
  hideRowOrColumn(sheet, colStart, rowStart)
  await bakeArray(arrayData.splice(0, headerRowIndex), rowStart, colStart, context)

  // set table applicationId in the top left cell
  arrayData[0][0] = `{"id":"","speckle_type":"Objects.Organization.DataTable","applicationId":"${item.applicationId}","totalChildrenCount":0}`
  await bakeTable(arrayData, context, sheet, name, rowStart, colStart, headerRowIndex)
  greyOutReadOnlyColumns(
    item.columnMetadata,
    rowStart + 1 + headerRowIndex,
    colStart + 1,
    arrayData.length - 1,
    sheet,
    context
  )
}

async function getExistingTableInLocation(context, sheet, rowStart, colStart) {
  let range = sheet.getRangeByIndexes(rowStart, colStart, 1, 1)
  var speckleTableContainingRange = await getDataTableContainingRange(range, sheet, context)
  if (!speckleTableContainingRange) {
    return null
  }
  return speckleTableContainingRange
}

async function getSpeckleIdFromTable(table, sheet, context) {
  let range = table.getRange()
  range.load('rowIndex, columnIndex')
  await context.sync()

  let firstCell = sheet.getRangeByIndexes(range.rowIndex, range.columnIndex, 1, 1)
  firstCell.load('values')
  await context.sync()

  let appIdObj = JSON.parse(firstCell.values[0][0])
  return appIdObj.applicationId
}

async function getMetadataIndex(table, sheet, context) {
  table.load('id')
  await context.sync()
  let tableId = removeNonAlphanumericCharacters(table.id)
  let speckleRowMeta = sheet.names.getItemOrNullObject(`speckleRowMetadata_${tableId}`)
  await context.sync()
  if (speckleRowMeta.isNullObject) {
    return [-1, -1]
  }

  let speckleRowMetaRange = speckleRowMeta.getRange()
  speckleRowMetaRange.load('columnIndex, rowIndex')
  await context.sync()

  return [speckleRowMetaRange.rowIndex, speckleRowMetaRange.columnIndex]
}

export async function getDataTableContainingRange(range, sheet, context) {
  let selectedTable = null
  sheet.tables.load('count')
  await context.sync()

  for (let i = 0; i < sheet.tables.count; i++) {
    let table = sheet.tables.getItemAt(i)
    let tableMetataIndicies = await getMetadataIndex(table, sheet, context)

    if (tableMetataIndicies[0] == -1 && tableMetataIndicies[1] == -1) {
      continue
    }

    let tableRange = table.getRange()
    tableRange.load('address')
    range.load('address')
    await context.sync()

    let tableRangeIndicies = getIndiciesFromRangeAddress(tableRange.address)
    let rangeIndicies = getIndiciesFromRangeAddress(range.address)
    if (
      // sorry these indicies don't cooperate very well. Get metadata index return [rowindex, colindex]
      // while getIndiciesFromRangeAddress return indicies as excel addresses display them [colindex, rowindex, endcolindex, endRowIndex]
      tableMetataIndicies[0] <= rangeIndicies[1] &&
      tableMetataIndicies[1] <= rangeIndicies[0] &&
      tableRangeIndicies[3] >= rangeIndicies[3] &&
      tableRangeIndicies[2] >= rangeIndicies[2]
    ) {
      selectedTable = sheet.tables.getItemAt(i)
      break
    } else {
      console.log(
        "Are you trying to send a data table? Make sure your selection doesn't extended beyond the table"
      )
    }
  }

  if (selectedTable == null) {
    return null
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

  if (firstCellRange.values[0][0].includes('Objects.Organization.DataTable')) {
    return true
  }
  return false
}

async function greyOutReadOnlyColumns(
  columnMetadata,
  rowStartIndex,
  colStartIndex,
  rowCount,
  sheet,
  context
) {
  for (let i = 0; i < columnMetadata.length; i++) {
    if (columnMetadata[i].IsReadOnly) {
      let range = sheet.getRangeByIndexes(rowStartIndex, colStartIndex + i, rowCount, 1)
      range.format.fill.color = '#AEAAAA'
    }
  }

  await context.sync()
}

export async function BuildDataTableObject(sendingRange, values, table, sheet, context) {
  let metaRowIndex = await GetColumnMetadataRowIndex(table, sheet, context)
  let metaColIndex = await GetRowMetadataColumnIndex(table, context)

  let speckleTable = new DataTable()
  speckleTable.applicationId = await GetTableApplicationId(table, context)

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
  tableRange.load('columnCount, columnIndex, rowCount, rowIndex')
  await context.sync()

  let extendedRowIndex = Math.max(0, tableRange.rowIndex - 5)

  let possibleMetadataRowRange = sheet.getRangeByIndexes(
    extendedRowIndex,
    tableRange.columnIndex,
    tableRange.rowIndex - extendedRowIndex,
    tableRange.columnCount
  )

  return await findMetadataRowIndex(possibleMetadataRowRange, context)
}

async function findMetadataRowIndex(range, context) {
  var found = range.findOrNullObject('SpeckleColumnMetadataRow', {
    completeMatch: false, // Match the whole cell value.
    matchCase: true, // Don't match case.
    searchDirection: window.Excel.SearchDirection.forward // Start search at the beginning of the range.
  })
  found.load('rowIndex')
  await context.sync()
  if (found.isNullObject) {
    found = range.findOrNullObject('speckle_type', {
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

async function GetTableApplicationId(table, context) {
  const headerRange = table.getHeaderRowRange()
  headerRange.load('values')
  await context.sync()

  const tableMetadata = JSON.parse(headerRange.values[0][0])
  if (!tableMetadata.hasOwnProperty('applicationId'))
    throw new Error('Cannot find TableApplicationId in table header metadata')

  return tableMetadata.applicationId
}

export async function onTableChanged(eventArgs) {
  if (eventArgs.changeType != 'ColumnDeleted') {
    return
  }
  await window.Excel.run(async (context) => {
    const tableId = removeNonAlphanumericCharacters(eventArgs.tableId)
    let sheet = context.workbook.worksheets.getActiveWorksheet()
    let speckleRowMeta = sheet.names.getItemOrNullObject(`speckleRowMetadata_${tableId}`)
    await context.sync()
    if (speckleRowMeta.isNullObject) {
      console.log('speckle row metadata was null')
      return
    }
    let table = sheet.tables.getItem(eventArgs.tableId)
    let tableRange = table.getRange()

    let speckleRowMetaRange = speckleRowMeta.getRange()
    speckleRowMetaRange.load('columnIndex')
    tableRange.load('columnCount, columnIndex')
    await context.sync()

    if (tableRange.columnCount == 1 && tableRange.columnIndex == speckleRowMetaRange.columnIndex) {
      let speckleColumnMeta = sheet.names.getItemOrNullObject(`speckleColumnMetadata_${tableId}`)
      await deleteMetadata(speckleRowMeta, false, context)
      await deleteMetadata(speckleColumnMeta, true, context)
    }
  })
}
export async function onTableDeleted(eventArgs) {
  await window.Excel.run(async (context) => {
    await cleanUpTableMetadata(eventArgs.tableId, context)
  })
}

async function cleanUpTableMetadata(originalTableId, context) {
  const tableId = removeNonAlphanumericCharacters(originalTableId)
  let sheet = context.workbook.worksheets.getActiveWorksheet()
  let speckleColumnMeta = sheet.names.getItemOrNullObject(`speckleColumnMetadata_${tableId}`)
  let speckleRowMeta = sheet.names.getItemOrNullObject(`speckleRowMetadata_${tableId}`)
  await context.sync()

  // warning: must delete rowMetadata (which is actually a column) before deleting the colMetadata
  await deleteMetadata(speckleRowMeta, false, context)
  await deleteMetadata(speckleColumnMeta, true, context)
}

async function deleteMetadata(namedRange, isRow, context) {
  if (namedRange.isNullObject) {
    return
  }

  let speckleMetaRange = namedRange.getRange()

  try {
    await findMetadataRowIndex(speckleMetaRange, context)
  } catch {
    console.log('speckle metadata doesnt exist in this range anymore')
    return
  }

  if (isRow) {
    speckleMetaRange.load('rowHidden')
    await context.sync()

    if (speckleMetaRange.rowHidden) {
      speckleMetaRange.getEntireRow().delete('Up')
    } else {
      speckleMetaRange.clear('Contents')
    }
  } else {
    speckleMetaRange.load('columnHidden')
    await context.sync()

    if (speckleMetaRange.columnHidden) {
      speckleMetaRange.getEntireColumn().delete('Left')
    } else {
      speckleMetaRange.clear('Contents')
    }
  }

  namedRange.delete()
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

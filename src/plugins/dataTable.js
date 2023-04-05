import { bakeTable, bakeArray, hideRowOrColumn } from './excel'
export const tableName = 'SpeckleDataTable'

export function checkIfReceivingDataTable(item) {
  if (!(item.speckle_type && item.speckle_type.split('.').at(-1) == 'DataTable')) {
    return false
  }
  return true
}

export function formatArrayDataForTable(item, arrayData) {
  if (item.RowCount > 0) arrayData.pop()

  for (let i = 0; i < item.RowCount; i++) {
    let row = []
    row.push(JSON.stringify(item.rowMetadata[i]))
    row.push(...item.Data[i])
    arrayData.push(row)
  }
}

export async function bakeDataTable(item, arrayData, context, sheet, rowStart, colStart) {
  let headerRowIndex = 1
  if (item.headerRowIndex) {
    headerRowIndex = item.headerRowIndex
  }
  let name = 'DataTable'
  if (item.name) {
    name = item.name
  }
  // hideRowOrColumn(sheet, colStart)
  await bakeArray(arrayData.splice(0, headerRowIndex), context)
  await bakeTable(arrayData, context, sheet, name, rowStart + 1, colStart, headerRowIndex)
  hideRowOrColumn(sheet, colStart, rowStart)
}

export function checkIfSendingDataTable(rangeAddress, values, sheet, context) {
  console.log(rangeAddress, values, sheet, context)
  //   let namedRangesInSheet = getDataTables(sheet)
  //   if (!namedRangesInSheet) {
  //     return false
  //   }

  //   //check if sending range matches dataTable range
  //   for (let [key, value] of namedRangesInSheet) {
  //     let dataTableRange = value.getRangeOrNullObject()

  //   }
}

export function getDataTables(sheet) {
  let namedRanges = new Map()
  for (let i = 0; i < 10; i++) {
    let namedRange = sheet.names.getItemOrNullObject(`${tableName}${i}`)
    if (namedRange) {
      namedRanges.set(i, namedRange)
    }
  }
  return namedRanges
}

class Base {
  id
  totalChildrenCount
  applicationId
  speckle_type
}

export class DataTable extends Base {
  get columnCount() {
    return this.columnMetadata.length
  }
  get rowCount() {
    return this.rowMetadata.length
  }
  get speckle_type() {
    return 'Objects.Organization.DataTable'
  }
  headerRowIndex = 1
  columnMetadata = []
  rowMetadata = []
  data = []

  addRow(metadata, objects) {
    if (objects.length != this.columnCount)
      throw new Error(
        `object length of ${objects.length} does not match the column count, ${this.columnCount}`
      )
    let list = [metadata, ...objects]
    this.data.push(list)
  }

  defineColumn(metadata) {
    this.columnMetadata.push(metadata)
  }
}

// export function checkIfSendingDataTable(item, arrayData) {

// }

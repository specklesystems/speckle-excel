export function checkIfReceivingDataTable(item, arrayData) {
  if (!(item.speckle_type && item.speckle_type.split('.').at(-1) == 'DataTable')) {
    return false
  }

  if (item.RowCount > 0) arrayData.pop()

  for (let i = 0; i < item.RowCount; i++) {
    let row = []
    row.push(JSON.stringify(item.rowMetadata[i]))
    row.push(...item.Data[i])
    arrayData.push(row)
  }

  return true
}

class Base {
  id
  totalChildrenCount
  applicationId
  speckle_type
}

export class DataTable extends Base {
  // public int ColumnCount => columnMetadata.Count;
  get ColumnCount() {
    return this.columnMetadata.length
  }
  get RowCount() {
    return this.rowMetadata.length
  }
  // public List<Base> rowMetadata { get; set; }
  // public List<Base> columnMetadata { get; set; }
  // public List<List<object>> Data { get; set; }
  columnMetadata = []
  rowMetadata = []
  Data = []

  addRow(metadata, objects) {
    if (objects.length != this.ColumnCount)
      throw new Error(
        `object length of ${objects.length} does not match the column count, ${this.ColumnCount}`
      )
    let list = [metadata, ...objects]
    this.Data.push(list)
  }

  defineColumn(metadata) {
    this.columnMetadata.push(metadata)
  }
}

// export function checkIfSendingDataTable(item, arrayData) {

// }

export function checkIfReceivingDataTable(item, arrayData) {
  if (!(item.speckle_type && item.speckle_type.split('.').at(-1) == 'DataTable')) {
    return false
  }

  if (item.RowCount > 0) arrayData.pop()

  for (let i = 0; i < item.RowCount; i++) {
    let row = []
    row.push(JSON.stringify(item.Rows[i].Metadata))
    let index = i * item.ColumnCount
    row.push(...item.DataStorage.SerializedData.slice(index, index + item.ColumnCount))
    arrayData.push(row)
  }

  return true
  // let allItems = [...item.DataStorage.SerializedData]
  // while (allItems.length > item.ColumnCount) {
  //   arrayData.push(allItems.splice(0, item.ColumnCount))
  // }
}

// export function checkIfSendingDataTable(item, arrayData) {

// }

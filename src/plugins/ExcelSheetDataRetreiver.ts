export class ExcelSheetDataRetriever {
  // Takes address as a string formatted like this 'Sheet1!A1:B4' and returns a 2d array of values.
  // This queries the document in batches in order to avoid api errors about requests that are too large
  static async GetValuesAsNestedList(
    context: Excel.RequestContext,
    address: string
  ): Promise<any[][]> {
    const sheetName = address.split('!')[0].replace(/'/g, '')
    const rangeAddress = address.split('!')[1]
    const sheet = context.workbook.worksheets.getItem(sheetName)

    const totalRange = sheet.getRange(rangeAddress)
    totalRange.load('columnCount, columnIndex, rowCount, rowIndex')
    await context.sync()

    let numRowsRetrieved = 0
    const chunkSize = 5000
    let values: any[][] = []

    while (numRowsRetrieved < totalRange.rowCount) {
      const numRowsToRetrieve = Math.min(chunkSize, totalRange.rowCount - numRowsRetrieved)
      const currentRange = sheet.getRangeByIndexes(
        totalRange.rowIndex + numRowsRetrieved,
        totalRange.columnIndex,
        numRowsToRetrieve,
        totalRange.columnCount
      )
      currentRange.load('values')
      await context.sync()
      values = values.concat(currentRange.values)

      numRowsRetrieved += numRowsToRetrieve
    }

    return values
  }
}

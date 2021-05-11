import flatten from 'flat'

let rowIndex = 1
let ignoredProps = ['reference', 'totalChildrenCount']
let headers = []
let streamId, store, sheet

async function bakeRow(item) {
  if (Array.isArray(item)) {
    console.log('list')
    for (let o of item) {
      await bakeRow(o)
    }
  } else if (item.speckle_type && item.speckle_type == 'reference') {
    console.log('reference')
    let loader = await store.dispatch('getObject', {
      streamId: streamId,
      objectId: item.referencedId
    })

    for await (let o of loader.getObjectIterator()) {
      if (o.totalChildrenCount > 0) continue

      await bakeRow(o)
    }
  } else {
    let flat = flatten(item)
    console.log(flat)
    console.log(rowIndex)

    for (const [key, value] of Object.entries(flat)) {
      if (ignoredProps.includes(key)) continue

      let colIndex = headers.findIndex((x) => x === key)
      if (colIndex === -1) {
        colIndex = headers.length
        let keyRange = sheet.getCell(0, colIndex)
        keyRange.values = key
        headers.push(key)
      }
      console.log(colIndex)
      let valueRange = sheet.getCell(rowIndex, colIndex)
      valueRange.values = value
    }
    rowIndex++
  }
}

export async function bake(obj, _streamId, _store) {
  window.Excel.run(async (context) => {
    sheet = context.workbook.worksheets.getActiveWorksheet()
    sheet.load('items/name')

    rowIndex = 1
    headers = []
    streamId = _streamId
    store = _store

    await bakeRow(obj)

    // sheet.tables.load('items')

    // let objectTable = null

    // objectTable = sheet.tables.getItemOrNullObject('SpeckleTable_' + this.stream.id)

    // objectTable.rows.load('items')
    // objectTable.columns.load('items')

    await context.sync()
  })
}

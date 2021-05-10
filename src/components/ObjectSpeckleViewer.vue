<template>
  <v-card :class="`my-1 pa-0 ${localExpand ? 'elevation-3' : 'elevation-0'} my-0`">
    <v-card-title>
      <v-chip color="" @click="toggleLoadExpand">
        <v-icon small class="mr-2">mdi-code-braces</v-icon>
        {{ keyName }}
        <span class="caption ml-2">
          {{ object && object.data.speckle_type ? object.data.speckle_type : 'Referenced Object' }}
        </span>
        <v-icon small class="ml-2">
          {{ localExpand ? 'mdi-minus' : 'mdi-plus' }}
        </v-icon>
      </v-chip>
      <v-btn icon small @click="bake">
        <v-icon small>mdi-download</v-icon>
      </v-btn>
    </v-card-title>

    <v-card-text v-if="localExpand" class="pr-0 pl-3">
      <v-skeleton-loader
        v-if="$apollo.loading"
        type="list-item-three-line, list-item-three-line"
      ></v-skeleton-loader>
      <component
        :is="entry.type"
        v-for="(entry, index) in objectEntries"
        :key="index"
        :key-name="entry.key"
        :value="entry.value"
        :stream-id="streamId"
      ></component>
    </v-card-text>
  </v-card>
</template>
<script>
import objectQuery from '../graphql/object.gql'

export default {
  name: 'ObjectSpeckleViewer',
  components: {
    ObjectListViewer: () => import('./ObjectListViewer'),
    ObjectSimpleViewer: () => import('./ObjectSimpleViewer'),
    ObjectValueViewer: () => import('./ObjectValueViewer')
  },
  props: {
    expand: {
      type: Boolean,
      default: false
    },
    value: {
      type: Object,
      default: null
    },
    keyName: {
      type: String,
      default: null
    },
    streamId: {
      type: String,
      default: null
    }
  },
  data() {
    return {
      localExpand: false
    }
  },
  apollo: {
    object: {
      query: objectQuery,
      variables() {
        return {
          streamId: this.streamId,
          id: this.value.referencedId
        }
      },
      skip() {
        return !this.localExpand
      },
      update: (data) => {
        delete data.stream.object.data.__closure
        return data.stream.object
      }
    }
  },
  computed: {
    objectEntries() {
      if (!this.object) return []
      let entries = Object.entries(this.object.data)
      let arr = []
      for (let [key, val] of entries) {
        if (key.startsWith('__')) continue
        if (key[0] === '@') key = key.substring(1)
        if (key === 'totalChildrenCount') key = 'total children count'
        if (key === 'speckle_type') key = 'speckle type'

        if (Array.isArray(val)) {
          arr.push({
            key,
            value: val,
            type: 'ObjectListViewer',
            description: `List (${val.length} elements)`
          })
        } else if (typeof val === 'object' && val !== null) {
          if (val.speckle_type && val.speckle_type === 'reference') {
            arr.push({
              key,
              value: val,
              type: 'ObjectSpeckleViewer'
            })
          } else {
            arr.push({
              key,
              value: val,
              type: 'ObjectSimpleViewer'
            })
          }
        } else {
          arr.push({
            key,
            value: val,
            type: 'ObjectValueViewer'
          })
        }
      }
      arr.sort((a, b) => {
        if (a.type === b.type) return 0
        if (a.type === 'ObjectValueViewer') return -1
        return 0
      })
      return arr
    }
  },
  mounted() {
    this.localExpand = this.expand
  },
  methods: {
    toggleLoadExpand() {
      this.localExpand = !this.localExpand
    },
    async bake() {
      if (!this.object) {
        this.$apollo.queries.object.start()
        while (this.$apollo.queries.object.loading) {
          //wait
        }
      }
      console.log(this.object)

      //   window.Excel.run(async (context) => {
      //     var sheet = context.workbook.worksheets.getActiveWorksheet()
      //     sheet.load('items/name')

      //     let rowIndex = 1

      //     let ignoredProps = ['reference', 'totalChildrenCount']
      //     let headers = []
      //     for await (let obj of loader.getObjectIterator()) {
      //       if (obj.totalChildrenCount > 0) continue

      //       //var flat = flatten(obj)

      //       for (const [key, value] of Object.entries(obj)) {
      //         if (ignoredProps.includes(key)) continue

      //         let colIndex = headers.findIndex((x) => x === key)
      //         if (colIndex === -1) {
      //           colIndex = headers.length
      //           let keyRange = sheet.getCell(0, colIndex)
      //           keyRange.values = key
      //           headers.push(key)
      //         }

      //         let valueRange = sheet.getCell(rowIndex, colIndex)
      //         valueRange.values = JSON.stringify(value)
      //       }
      //       rowIndex++
      //       //console.log(obj, `Progress: ${count++}/${total}`)
      //     }

      //     // sheet.tables.load('items')

      //     // let objectTable = null

      //     // objectTable = sheet.tables.getItemOrNullObject('SpeckleTable_' + this.stream.id)

      //     // objectTable.rows.load('items')
      //     // objectTable.columns.load('items')

      //     await context.sync()
      //   })
    }
  }
}
</script>

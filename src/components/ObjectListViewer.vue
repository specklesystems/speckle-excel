<template>
  <v-card :class="`my-1 mb-0 pa-0 pb-2 ${localExpand ? 'elevation-3' : 'elevation-0'} my-0`">
    <v-card-title>
      <v-chip @click="toggleLoadExpand">
        <v-icon small class="mr-2">mdi-code-array</v-icon>
        {{ keyName }}
        <span class="caption ml-2">List ({{ value.length }} elements)</span>
        <v-icon class="ml-2" small>
          {{ localExpand ? 'mdi-minus' : 'mdi-plus' }}
        </v-icon>
      </v-chip>
      <v-progress-circular
        v-if="progress"
        size="20"
        class="ml-1"
        indeterminate
        color="grey"
      ></v-progress-circular>
      <v-btn v-else icon small @click="bake">
        <v-icon small>mdi-download</v-icon>
      </v-btn>
    </v-card-title>
    <v-card-text v-if="localExpand" class="pb-0 pr-0 pl-3">
      <component
        :is="entry.type"
        v-for="(entry, index) in rangeEntries"
        :key="index"
        :key-name="entry.key"
        :value="entry.value"
        :stream-id="streamId"
      ></component>
    </v-card-text>
    <v-card-text v-if="localExpand && currentLimit < value.length">
      <v-btn small @click="loadMore">Show more</v-btn>
    </v-card-text>
    <modal ref="modal" />
  </v-card>
</template>
<script>
import { bake } from '../plugins/excel'
export default {
  name: 'ObjectListViewer',
  components: {
    Modal: () => import('./Modal'),
    ObjectSpeckleViewer: () => import('./ObjectSpeckleViewer'),
    ObjectSimpleViewer: () => import('./ObjectSimpleViewer'),
    ObjectValueViewer: () => import('./ObjectValueViewer')
  },
  props: {
    value: {
      type: Array,
      default: () => []
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
      localExpand: false,
      itemsPerLoad: 3,
      currentLimit: 3,
      progress: false
    }
  },
  computed: {
    rangeEntries() {
      let arr = []
      let index = 0
      for (let val of this.range) {
        index++
        if (Array.isArray(val)) {
          arr.push({
            key: `${index}`,
            value: val,
            type: 'ObjectListViewer'
          })
        } else if (typeof val === 'object' && val !== null) {
          if (val.speckle_type && val.speckle_type === 'reference') {
            arr.push({
              key: `${index}`,
              value: val,
              type: 'ObjectSpeckleViewer'
            })
          } else {
            arr.push({
              key: `${index}`,
              value: val,
              type: 'ObjectSimpleViewer'
            })
          }
        } else {
          arr.push({
            key: `${index}`,
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
    },
    range() {
      return this.value.slice(0, this.currentLimit)
    }
  },
  methods: {
    toggleLoadExpand() {
      this.localExpand = !this.localExpand
    },
    loadMore() {
      this.currentLimit += this.itemsPerLoad
    },
    async bake() {
      this.progress = true
      await bake(this.value, this.streamId, this.$refs.modal)
      this.progress = false
    }
  }
}
</script>
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
      <v-dialog v-model="progress" persistent>
        <v-card class="pt-3">
          <v-card-text class="caption">
            Receiving data from the Speckleverse...

            <v-progress-linear class="mt-2" indeterminate color="primary"></v-progress-linear>
            <v-btn class="mt-3" outlined x-small color="primary" @click="cancel">Cancel</v-btn>
          </v-card-text>
        </v-card>
      </v-dialog>
      <v-btn icon small @click="bake">
        <v-icon small>mdi-download</v-icon>
      </v-btn>
    </v-card-title>
    <v-card-text v-if="localExpand" class="pb-0 pr-0 pl-3">
      <component
        :is="entry.type"
        v-for="(entry, index) in rangeEntries"
        :key="index"
        :key-name="entry.key"
        :full-key-name="fullKeyName ? `${fullKeyName}.${entry.key}` : entry.key"
        :value="entry.value"
        :stream-id="streamId"
        :commit-id="commitId"
        :commit-msg="commitMsg"
      ></component>
    </v-card-text>
    <v-card-text v-if="localExpand && currentLimit < value.length">
      <v-btn small @click="loadMore">Show more</v-btn>
    </v-card-text>
    <filter-modal ref="modal" />
  </v-card>
</template>
<script>
import { bake } from '../plugins/excel'
let ac = new AbortController()
export default {
  name: 'ObjectListViewer',
  components: {
    FilterModal: () => import('./FilterModal'),
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
    fullKeyName: {
      type: String,
      default: null
    },
    streamId: {
      type: String,
      default: null
    },
    commitId: {
      type: String,
      default: null
    },
    commitMsg: {
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
    cancel() {
      ac.abort()
    },
    async bake() {
      ac = new AbortController()

      this.progress = true
      this.$mixpanel.track('Receive')

      let receiverSelection = await bake(
        this.value,
        this.streamId,
        this.commitId,
        this.commitMsg,
        this.$refs.modal,
        ac.signal
      )
      if (receiverSelection) {
        receiverSelection.fullKeyName = this.fullKeyName

        this.$store.dispatch('setReceiverSelection', {
          id: this.streamId,
          receiverSelection: receiverSelection
        })
      }

      this.progress = false
    }
  }
}
</script>

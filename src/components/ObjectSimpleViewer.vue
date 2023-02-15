<template>
  <v-card :class="`my-1 pa-0 ${localExpand ? 'elevation-3' : 'elevation-0'} my-0`">
    <v-card-title>
      <v-chip color="" @click="toggleLoadExpand">
        <v-icon class="mr-2" small>mdi-code-braces</v-icon>
        {{ keyName }}
        <span class="caption ml-2">
          {{ value.speckle_type ? value.speckle_type : 'Object' }}
        </span>
        <v-icon small class="ml-2">
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
    <v-card-text v-if="localExpand" class="pr-0 pl-3">
      <component
        :is="entry.type"
        v-for="(entry, index) in objectEntries"
        :key="index"
        :key-name="entry.name"
        :full-key-name="fullKeyName ? `${fullKeyName}.${entry.key}` : entry.key"
        :value="entry.value"
        :stream-id="streamId"
        :commit-id="commitId"
        :commit-msg="commitMsg"
      ></component>
    </v-card-text>
    <filter-modal ref="modal" />
  </v-card>
</template>
<script>
import { bake } from '../plugins/excel'

let ac = new AbortController()

export default {
  name: 'ObjectSimpleViewer',
  components: {
    FilterModal: () => import('./FilterModal'),
    ObjectListViewer: () => import('./ObjectListViewer'),
    ObjectSpeckleViewer: () => import('./ObjectSpeckleViewer'),
    ObjectValueViewer: () => import('./ObjectValueViewer')
  },
  props: {
    value: {
      type: Object,
      default: () => {}
    },
    streamId: {
      type: String,
      default: null
    },
    keyName: {
      type: String,
      default: null
    },
    fullKeyName: {
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
    },
    nearestObjectId: {
      type: String,
      default: null
    },
    pathFromNearestObject: {
      type: String,
      default: null
    }
  },
  data() {
    return {
      localExpand: false,
      progress: false
    }
  },
  computed: {
    objectEntries() {
      if (!this.value) return []
      let entries = Object.entries(this.value)
      let arr = []
      for (let [key, val] of entries) {
        let name = key
        if (key.startsWith('__')) continue
        if (key[0] === '@') name = key.substring(1)
        if (key === 'totalChildrenCount') name = 'total children count'
        if (key === 'speckle_type') name = 'speckle type'

        if (Array.isArray(val)) {
          arr.push({
            key,
            name,
            value: val,
            type: 'ObjectListViewer',
            description: `List (${val.length} elements)`
          })
          // TODO -> list value template displayer
        } else if (typeof val === 'object' && val !== null) {
          if (val.speckle_type && val.speckle_type === 'reference') {
            arr.push({
              key,
              name,
              value: val,
              type: 'ObjectSpeckleViewer'
            })
          } else {
            arr.push({
              key,
              name,
              value: val,
              type: 'ObjectSimpleViewer'
            })
          }
        } else {
          arr.push({
            key,
            name,
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
  methods: {
    toggleLoadExpand() {
      this.localExpand = !this.localExpand
    },
    cancel() {
      ac.abort()
    },
    async bake() {
      this.progress = true
      ac = new AbortController()

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

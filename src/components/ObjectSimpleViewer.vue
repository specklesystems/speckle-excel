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
    <v-card-text v-if="localExpand" class="pr-0 pl-3">
      <component
        :is="entry.type"
        v-for="(entry, index) in objectEntries"
        :key="index"
        :key-name="entry.key"
        :value="entry.value"
        :stream-id="streamId"
      ></component>
    </v-card-text>
    <modal ref="modal" />
  </v-card>
</template>
<script>
import { bake } from '../plugins/excel'

export default {
  name: 'ObjectSimpleViewer',
  components: {
    Modal: () => import('./Modal'),
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
          // TODO -> list value template displayer
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
  methods: {
    toggleLoadExpand() {
      this.localExpand = !this.localExpand
    },
    async bake() {
      this.progress = true
      await bake(this.value, this.streamId, this.$refs.modal)
      this.progress = false
    }
  }
}
</script>
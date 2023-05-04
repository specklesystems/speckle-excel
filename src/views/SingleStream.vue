<template>
  <v-card v-if="error" class="pa-5 mb-3" style="transition: all 0.2s">
    <v-card-title class="subtitle-1 px-0 pt-0">
      {{ error }} ⚠️
      <div class="floating">
        <!-- <v-btn
          v-tooltip="`Remove this stream from the document`"
          small
          icon
          color="red"
          @click="remove"
        >
          <v-icon small>mdi-minus-circle-outline</v-icon>
        </v-btn> -->
        <v-btn
          v-tooltip="`Open this stream in a new window`"
          small
          icon
          color="primary"
          :href="`${serverUrl}/streams/${savedStream.id}`"
          target="_blank"
        >
          <v-icon small>mdi-open-in-new</v-icon>
        </v-btn>
      </div>
    </v-card-title>
    <v-card-text class="px-0">
      <span v-if="error == 'Stream not found'">
        The stream might have been deleted or belog to another Speckle server
      </span>
      <span v-if="error == 'You do not have access to this resource.'">
        Please ask the stream owner for access or to make it public
      </span>
      <br />
      Stream Id: {{ savedStream.id }}
    </v-card-text>
  </v-card>
  <div v-else-if="$apollo.queries.stream.loading" class="mx-0 mb-3 fill-height background-light">
    <div class="progress-parent">
      <v-progress-circular
        indeterminate
        color="primary"
        :size="150"
        class="fill-height"
      ></v-progress-circular>
    </div>
  </div>
  <div v-else-if="stream" id="viewer-parent" class="background-light">
    <div v-if="viewerLoading" class="progress-parent">
      <v-progress-circular
        indeterminate
        color="primary"
        :size="150"
        class="fill-height"
      ></v-progress-circular>
    </div>
    <div id="viewer"></div>
    <div id="stream-info-parent">
      <StreamController
        ref="streamController"
        :stream="stream"
        @loadByReferencedId="loadViewerObjectByReferencedId"
        @loadByCommitId="loadViewerObjectByCommitId"
      />
    </div>
  </div>
</template>
<script>
import StreamController from '../components/StreamController.vue'
import streamQuery from '../graphql/stream.gql'
import {
  send,
  receiveLatest,
  getIndiciesFromRangeAddress,
  getRangeAddressFromIndicies
} from '../plugins/excel'
import gql from 'graphql-tag'
import { createClient } from '../vue-apollo'
import { Viewer, ViewerEvent } from '@speckle/viewer'
// import router from '../router'

let ac = new AbortController()

export default {
  components: {
    StreamController
  },
  async beforeRouteLeave(to, from, next) {
    // remove on selection changed event that is tied to the viewer
    if (this.onSelectionChangedEvent) {
      await window.Excel.run(this.onSelectionChangedEvent.context, async (context) => {
        this.onSelectionChangedEvent.remove()
        await context.sync()
        this.onSelectionChangedEvent = null
      })
    }
    next()
  },
  props: {
    streamId: {
      type: String,
      default: null
    },
    commitId: {
      type: String,
      default: null
    }
  },
  data() {
    return {
      error: null,
      progress: false,
      message: '',
      viewer: null,
      objectIds: null,
      selectedObjectIds: null,
      filterViewer: true,
      isReceiver: true,
      selection: null,
      hasHeaders: false,
      viewerLoading: false,
      referencedObject: null,
      onSelectionChangedEvent: null
    }
  },
  apollo: {
    stream: {
      prefetch: true,
      query: streamQuery,
      fetchPolicy: 'network-only',
      variables() {
        return {
          id: this.streamId
        }
      },
      result() {
        const index = this.$store.state.streams.streams.findIndex((x) => x.id === this.streamId)
        let savedStream = null
        if (index > -1) {
          savedStream = this.$store.state.streams.streams[index]
          this.$refs.streamController.isReceiver = savedStream.isReceiver
          this.$refs.streamController.selection = savedStream.selection
          this.$refs.streamController.hasHeaders = savedStream.hasHeaders
          this.$refs.streamController.selectedBranchName = savedStream.selectedBranchName
          this.$refs.streamController.selectedCommitId = savedStream.selectedCommitId
          this.$refs.streamController.receiverSelection = savedStream.receiverSelection
        } else {
          this.$refs.streamController.isReceiver = true
          this.$refs.streamController.selectedBranchName = this.$refs.streamController.selectedBranch.name
          this.$refs.streamController.selectedCommitId = this.selectedCommit.id
        }

        // if this page is reached via a link with a commit id, this set the branch and id on the card
        if (this.commitId) {
          this.$refs.streamController.selectedCommitId = this.commitId
          const branch = this.stream.branches.items.find((x) =>
            x.commits.items.findIndex(
              (y) => y.id == this.$refs.streamController.selectedCommitId - 1
            )
          )
          this.$refs.streamController.selectedBranchName = branch.name
        }

        this.$nextTick(function () {
          if (this.$refs.streamController.isReceiver) {
            this.loadViewerObjectByCommitId(this.$refs.streamController.selectedCommitId)
          }
        })
      },
      error(error) {
        console.log(this.error)
        this.error = JSON.stringify(error.message)
          .replaceAll('"', '')
          .replace('GraphQL error: ', '')
        console.log(this.error)
      }
    },
    $client: createClient(),
    $subscribe: {
      streamUpdated: {
        query: gql`
          subscription($id: String!) {
            streamUpdated(streamId: $id)
          }
        `,
        variables() {
          return { id: this.streamId }
        },
        result() {
          this.$apollo.queries.stream.refetch()
        }
      },
      commitCreated: {
        query: gql`
          subscription($streamId: String!) {
            commitCreated(streamId: $streamId)
          }
        `,
        variables() {
          return { streamId: this.streamId }
        },
        result(commitInfo) {
          this.$apollo.queries.stream.refetch()
          if (this.isReceiver)
            this.$store.dispatch('showSnackbar', {
              message: `New commit on ${this.stream.name} @ ${commitInfo.data.commitCreated.branchName}`
            })
        }
      },
      commitUpdated: {
        query: gql`
          subscription($id: String!) {
            commitUpdated(streamId: $id)
          }
        `,
        variables() {
          return { id: this.streamId }
        },
        result() {
          this.$apollo.queries.stream.refetch()
        }
      },
      branchCreated: {
        query: gql`
          subscription($id: String!) {
            branchCreated(streamId: $id)
          }
        `,
        variables() {
          return { id: this.streamId }
        },
        result() {
          this.$apollo.queries.stream.refetch()
        }
      },
      branchDeleted: {
        query: gql`
          subscription($id: String!) {
            branchDeleted(streamId: $id)
          }
        `,
        variables() {
          return { id: this.streamId }
        },
        result() {
          this.$apollo.queries.stream.refetch()
        }
      },
      branchUpdated: {
        query: gql`
          subscription($id: String!) {
            branchUpdated(streamId: $id)
          }
        `,
        variables() {
          return { id: this.streamId }
        },
        result() {
          this.$apollo.queries.stream.refetch()
        }
      }
    }
  },
  computed: {
    serverUrl() {
      return this.$store.getters.serverUrl
    },
    savedStream() {
      return {
        id: this.streamId,
        isReceiver: this.isReceiver,
        selection: this.selection,
        hasHeaders: this.hasHeaders,
        selectedBranchName: this.$refs.streamController.selectedBranchName,
        selectedCommitId: this.$refs.streamController.selectedCommitId,
        receiverSelection: this.receiverSelection
      }
    }
  },
  methods: {
    async initViewer() {
      if (this.viewer) {
        return
      }

      var container = document.getElementById('viewer')
      var v = new Viewer(container)
      await v.init()

      // highlight selected objects in sheet
      v.on(ViewerEvent.ObjectClicked, async (data) => {
        console.log(data?.hits[0]?.object.id)
        var speckleId = data?.hits[0]?.object.id
        if (speckleId == undefined) v.resetFilters()
        else {
          v.selectObjects(new Array(data?.hits[0]?.object.id))
          await window.Excel.run(async (context) => {
            var sheet = context.workbook.worksheets.getActiveWorksheet()
            var range = sheet.getUsedRange()
            var found = range.findOrNullObject(speckleId, {
              completeMatch: false, // Match the whole cell value.
              matchCase: false, // Don't match case.
              searchDirection: window.Excel.SearchDirection.forward // Start search at the beginning of the range.
            })

            found.load('address')
            // Update the fill color
            if (found) {
              // var extendedRange = found.get
              this.filterViewer = false
              found.getExtendedRange(window.Excel.KeyboardDirection.left, found).select()
            }
            await context.sync()
          })
        }
      })

      // highlight selected objects in viewer
      await window.Excel.run(async (context) => {
        var sheet = context.workbook.worksheets.getActiveWorksheet()
        this.onSelectionChangedEvent ??= sheet.onSelectionChanged.add(this.checkModelForSelection)
        await context.sync()
      })

      v.setLightConfiguration({
        enabled: true,
        castShadow: false, // there is a bug involving the shadows so turn them off for now
        intensity: 5,
        color: 0xffffff,
        elevation: 1.33,
        azimuth: 0.75,
        radius: 0,
        indirectLightIntensity: 1.2,
        shadowcatcher: true
      })
      this.viewer = v
    },
    async loadViewerObjectByReferencedId(referencedObject) {
      if (referencedObject === this.referencedObject) return
      if (this.viewerLoading) {
        await this.viewer?.cancelLoad(
          `${this.serverUrl}/streams/${this.streamId}/objects/${this.referencedObject}`,
          true
        )
        this.viewerLoading = false
      }
      this.referencedObject = referencedObject
      await this.initViewer()
      await this.viewer?.unloadAll()
      this.viewerLoading = true

      const APP_NAME = process.env.VUE_APP_SPECKLE_NAME
      const TOKEN = `${APP_NAME}.AuthToken`
      try {
        await this.viewer?.loadObject(
          `${this.serverUrl}/streams/${this.streamId}/objects/${referencedObject}`,
          localStorage.getItem(TOKEN)
        )
      } finally {
        if (referencedObject == this.referencedObject) this.viewerLoading = false
      }
    },
    async loadViewerObjectByCommitId(commitId) {
      const index = this.$refs.streamController.selectedBranch.commits.items.findIndex(
        (x) => x.id === commitId
      )

      await this.loadViewerObjectByReferencedId(
        this.$refs.streamController.selectedBranch.commits.items[index].referencedObject
      )
    },
    async checkModelForSelection() {
      if (!this.filterViewer) {
        this.filterViewer = true
        return
      }
      let speckleIdColIndex = await this.getSpeckleIdsColIndex()
      await window.Excel.run(async (context) => {
        // Get the selected range.
        let range = context.workbook.getSelectedRange()
        range.load('address')
        await context.sync()
        let selectedRangeIndicies = getIndiciesFromRangeAddress(range.address)

        if (selectedRangeIndicies[0] > speckleIdColIndex) {
          this.unisolateObjects()
          return
        }

        let speckleIdRangeAddress = getRangeAddressFromIndicies(
          selectedRangeIndicies[1],
          speckleIdColIndex,
          selectedRangeIndicies[3],
          speckleIdColIndex
        )
        let speckleIdRange = context.workbook.worksheets
          .getActiveWorksheet()
          .getRange(speckleIdRangeAddress)
        speckleIdRange.load('text')
        await context.sync()

        let idsInViewer = new Array()
        for (let i = 0; i < speckleIdRange.text?.length; i++) {
          for (let j = 0; j < speckleIdRange.text[i].length; j++) {
            if (speckleIdRange.text[i][j].length < 32) continue
            let splitIDs = speckleIdRange.text[i][j].split(',')
            for (let id = 0; id < splitIDs.length; id++) {
              if (splitIDs[id].length == 32) idsInViewer.push(splitIDs[id])
            }
          }
        }

        this.unisolateObjects()

        if (idsInViewer.length > 0) {
          this.viewer?.isolateObjects(idsInViewer)
          this.selectedObjectIds = idsInViewer
          // this.viewer?.zoom(idsInViewer)
        }
      })
    },
    unisolateObjects() {
      // unisolate previous objects
      if (this.selectedObjectIds?.length > 0) {
        this.viewer?.resetFilters()
        this.viewer?.unIsolateObjects(this.selectedObjectIds)
        this.selectedObjectIds = null
      }
    },
    async getSpeckleIdsColIndex() {
      return await window.Excel.run(async (context) => {
        let sheet = context.workbook.worksheets.getActiveWorksheet()
        let usedRange = sheet.getUsedRange()

        // TODO: we may need to narrow the search field for large wbs
        // or if we want to have more stable support for multiple tables in the same sheet

        var found = usedRange.findOrNullObject('speckleIDs', {
          completeMatch: true, // Match the whole cell value.
          matchCase: true, // Don't match case.
          searchDirection: window.Excel.SearchDirection.forward // Start search at the beginning of the range.
        })
        found.load('address')
        await context.sync()

        var idHeaderAddressIndicies = getIndiciesFromRangeAddress(found.address)
        return idHeaderAddressIndicies[0]
      })
    },
    cancel() {
      ac.abort()
    },
    async send() {
      // these values need to be set to null or the models will not load
      // when switching back to the receive mode
      this.viewer = null
      this.referencedObject = null
      this.$store.dispatch('addStream', this.savedStream)

      this.$mixpanel.track('Send')
      send(
        this.savedStream,
        this.stream.id,
        this.$refs.streamController.selectedBranch.name,
        this.message
      )
    },
    async receiveLatest() {
      // this.$mixpanel.track('Receive')
      ac = new AbortController()

      console.log(this.savedStream.receiverSelection)

      this.progress = true
      await receiveLatest(
        this.selectedCommit.referencedObject,
        this.stream.id,
        this.selectedCommit.id,
        this.selectedCommit.message,
        this.savedStream.receiverSelection,
        ac.signal
      )
      this.progress = false
    },
    formatCommitName(id) {
      if (this.$refs.streamController.selectedBranch.commits.items[0].id == id) {
        return 'latest'
      }
      return id
    }
  }
}
</script>
<style>
.stream-card-select .v-text-field__details {
  display: none !important;
}
.v-btn .lower {
  text-transform: none;
}
.floating {
  position: absolute;
  top: 0;
  right: 0;
  margin: 10px;
}
#stream-info-parent {
  /* max-width: 600px; */
  /* left: 50%;
  transform: translateX(-50%); */
  position: absolute;
  left: 0;
  right: 0;
  margin: 0 auto;
  bottom: 0px;
  display: flex;
  justify-content: center;
}
#stream-info {
  max-width: 400px;
  margin: 15px;
  padding: 0 !important;
}
#stream-info .row {
  padding: 0px;
  margin: 0px;
}
#viewer {
  position: absolute;
  top: 0;
  width: 100%;
  height: 100%;
}
#viewer-parent {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
}
.background-light {
  background: #8e9eab;
  background: -webkit-linear-gradient(to top right, #eeeeee, #c8e8ff) !important;
  background: linear-gradient(to top right, #ffffff, #c8e8ff) !important;
}

.background-dark {
  background: #141e30;
  background: -webkit-linear-gradient(to top left, #243b55, #141e30) !important;
  background: linear-gradient(to top left, #243b55, #141e30) !important;
}

.progress-parent {
  height: 100%;
  position: absolute;
  left: 0;
  right: 0;
  margin: 0 auto;
  display: flex;
  justify-content: center;
}
.v-progress-circular {
  height: 100%;
  display: block;
  margin: auto;
}
</style>

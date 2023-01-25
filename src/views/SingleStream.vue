<template>
  <v-card v-if="error" class="pa-5 mb-3" style="transition: all 0.2s">
    <v-card-title class="subtitle-1 px-0 pt-0">
      {{ error }} ⚠️
      <div class="floating">
        <v-btn
          v-tooltip="`Remove this stream from the document`"
          small
          icon
          color="red"
          @click="remove"
        >
          <v-icon small>mdi-minus-circle-outline</v-icon>
        </v-btn>
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
  <div v-else-if="$apollo.queries.stream.loading" class="mx-0 mb-3">
    <v-skeleton-loader type="article"></v-skeleton-loader>
  </div>
  <div v-else-if="stream" id="viewer-parent">
    <div id="viewer" class="background-light"></div>
    <v-card id="stream-info" class="pa-5 ma-3" style="transition: all 0.2s">
      <v-row>
        <v-col class="align-self-center">
          <div class="subtitle-1">
            {{ stream.name }}
          </div>

          <div class="floating">
            <v-btn
              v-tooltip="`Remove this stream from the document`"
              small
              icon
              color="red"
              @click="remove"
            >
              <v-icon small>mdi-minus-circle-outline</v-icon>
            </v-btn>
            <v-btn
              v-tooltip="`Open this stream in a new window`"
              small
              icon
              color="primary"
              :href="`${serverUrl}/streams/${stream.id}/branches/${selectedBranch.name}`"
              target="_blank"
            >
              <v-icon small>mdi-open-in-new</v-icon>
            </v-btn>

            <v-btn
              v-if="stream.role != 'stream:reviewer'"
              v-tooltip="`Click to make this a ` + (isReceiver ? `sender` : `receiver`)"
              small
              icon
              color="primary"
              @click="swapReceiver"
            >
              <v-icon small>mdi-swap-horizontal</v-icon>
            </v-btn>
          </div>
        </v-col>
      </v-row>
      <v-row class="stream-card-select">
        <v-col cols="6" class="pa-0 align-self-center">
          <v-select
            v-if="stream.branches"
            v-model="selectedBranch"
            :items="stream.branches.items"
            item-value="name"
            solo
            flat
            style="width: 100%"
            dense
            return-object
            class="d-inline-block mb-0 pb-0"
          >
            <template #selection="{ item }">
              <v-icon color="primary" small class="mr-1">mdi-source-branch</v-icon>
              <span class="text-truncate caption primary--text">{{ item.name }}</span>
            </template>
            <template #item="{ item }">
              <div class="pa-2">
                <p class="pa-0 ma-0 caption">{{ item.name }}</p>
                <p class="caption pa-0 ma-0 grey--text font-weight-light">
                  {{ item.description }}
                </p>
              </div>
            </template>
          </v-select>
        </v-col>
        <v-col cols="6" class="pa-0 align-self-start">
          <div v-if="isReceiver">
            <v-select
              v-if="
                selectedBranch && selectedBranch.commits && selectedBranch.commits.items.length > 0
              "
              v-model="selectedCommit"
              :items="selectedBranch.commits.items"
              item-value="id"
              solo
              flat
              dense
              style="width: 100%"
              return-object
              class="d-inline-block mb-0 pb-0"
            >
              <template #selection="{ item }">
                <v-icon color="primary" small class="mr-1">mdi-source-commit</v-icon>
                <span class="text-truncate caption primary--text">
                  {{ formatCommitName(item.id) }}
                </span>
              </template>
              <template #item="{ item }">
                <div class="pa-2">
                  <p class="pa-0 ma-0 caption">
                    {{ item.id }}
                    <span v-if="formatCommitName(item.id) == 'latest'">(latest)</span>
                  </p>
                  <p class="caption pa-0 ma-0 grey--text font-weight-light">
                    {{ item.message }}
                  </p>
                </div>
              </template>
            </v-select>
            <div v-else class="text-truncate caption mt-2 ml-3">
              <span>No commits to receive</span>
            </div>
          </div>
          <div v-else class="caption d-inline-flex" style="width: 100%">
            <span
              v-if="savedStream.selection"
              v-tooltip="savedStream.selection"
              class="mt-2 ml-2 text-truncate"
            >
              {{ savedStream.selection }}
            </span>
            <span v-else class="mt-2 ml-2">No range set</span>

            <v-menu>
              <template #activator="{ on, attrs }">
                <v-btn
                  v-tooltip="`Set or clear range`"
                  icon
                  color="primary"
                  small
                  text
                  v-bind="attrs"
                  class="ml-1 mt-1"
                  v-on="on"
                >
                  <v-icon small>mdi-dots-vertical</v-icon>
                </v-btn>
              </template>

              <v-list>
                <v-list-item @click="setRange(true)">
                  <v-list-item-title
                    v-tooltip="`Ranges with headers will be sent as objects`"
                    class="caption"
                  >
                    Set range with headers
                  </v-list-item-title>
                </v-list-item>
                <v-list-item @click="setRange(false)">
                  <v-list-item-title
                    v-tooltip="`Ranges without headers will be sent as data arrays`"
                    class="caption"
                  >
                    Set range
                  </v-list-item-title>
                </v-list-item>
                <v-list-item v-if="savedStream.selection" @click="clearSelection">
                  <v-list-item-title class="caption">Clear</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </div>
        </v-col>
      </v-row>
      <v-row v-if="isReceiver">
        <v-col class="align-self-center">
          <v-dialog v-model="progress" persistent>
            <v-card class="pt-3">
              <v-card-text class="caption">
                Receiving data from the Speckleverse...
                <v-progress-linear class="mt-2" indeterminate color="primary"></v-progress-linear>
                <v-btn class="mt-3" outlined x-small color="primary" @click="cancel">Cancel</v-btn>
              </v-card-text>
            </v-card>
          </v-dialog>
          <v-menu top offset-y>
            <template #activator="{ on, attrs }">
              <v-btn
                :disabled="!selectedCommit"
                color="primary"
                class="lower"
                v-bind="attrs"
                small
                v-on="on"
              >
                <v-img class="mr-2" width="30" height="30" src="../assets/ReceiverWhite@32.png" />

                Receive
              </v-btn>
            </template>

            <v-list v-if="selectedCommit" dense>
              <v-list-item :to="`/streams/${stream.id}/commits/${selectedCommit.id}`">
                <!-- <v-list-item @click="filterAndReceive"> -->
                <v-list-item-action class="mr-2">
                  <v-icon small>mdi-filter-variant</v-icon>
                </v-list-item-action>
                <v-list-item-content class="caption">Filter and receive</v-list-item-content>
              </v-list-item>
              <v-list-item :disabled="!savedStream.receiverSelection" @click="receiveLatest">
                <v-list-item-action class="mr-2">
                  <v-icon small>mdi-update</v-icon>
                </v-list-item-action>
                <v-list-item-content class="caption">Receive last selection</v-list-item-content>
              </v-list-item>
            </v-list>
          </v-menu>
          <!-- <span v-if="savedStream.receiverSelection">
            {{ savedStream.receiverSelection.fullKeyName }}
          </span> -->
        </v-col>
      </v-row>

      <v-row v-else>
        <v-col class="align-self-center d-inline-flex">
          <v-btn
            color="primary"
            small
            :disabled="!savedStream.selection"
            class="mt-1"
            @click="send"
          >
            <v-img class="mr-2" width="30" height="30" src="../assets/SenderWhite@32.png" />

            Send
          </v-btn>

          <v-text-field
            v-model="message"
            class="pt-0 mt-0 ml-3 caption"
            placeholder="Data from Excel"
          ></v-text-field>
        </v-col>
      </v-row>
      <!-- <div id="viewer" style="height: 200px"></div>
      <v-row>
        <v-col class="align-self-center d-inline-flex">
          <v-btn color="primary" small class="mt-1" @click="initViewer">
            <v-img class="mr-2" width="30" height="30" src="../assets/SenderWhite@32.png" />

            Send
          </v-btn>

          <v-text-field
            v-model="message"
            class="pt-0 mt-0 ml-3 caption"
            placeholder="Data from Excel"
          ></v-text-field>
        </v-col>
      </v-row> -->
    </v-card>
  </div>
</template>
<script>
import streamQuery from '../graphql/stream.gql'
import { send, receiveLatest } from '../plugins/excel'
import gql from 'graphql-tag'
import { createClient } from '../vue-apollo'
import { Viewer, ViewerEvent } from '@speckle/viewer'
// import router from '../router'

let ac = new AbortController()

export default {
  props: {
    streamId: {
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
      isReceiver: true,
      filterViewer: true
    }
  },
  apollo: {
    stream: {
      prefetch: true,
      query: streamQuery,
      fetchPolicy: 'network-only',
      variables() {
        return {
          id: this.savedStream.id
        }
      },
      error(error) {
        console.log(this.error)
        this.error = JSON.stringify(error.message)
          .replaceAll('"', '')
          .replace('GraphQL error: ', '')
        console.log(this.error)
      },
      skip() {
        return this.savedStream === null
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
          return { id: this.savedStream.id }
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
          return { streamId: this.savedStream.id }
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
          return { id: this.savedStream.id }
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
          return { id: this.savedStream.id }
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
          return { id: this.savedStream.id }
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
          return { id: this.savedStream.id }
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
      return this.$store.currentStream
    },
    selectedBranch: {
      get() {
        if (!this.stream || !this.stream.branches) return null

        let selectedBranchName = this.savedStream.selectedBranchName
          ? this.savedStream.selectedBranchName
          : 'main'
        const index = this.stream.branches.items.findIndex((x) => x.name === selectedBranchName)
        if (index > -1) return this.stream.branches.items[index]
        return this.stream.branches.items[0]
      },
      set(value) {
        let s = { ...this.savedStream }
        s.selectedBranchName = value.name
        this.$store.dispatch('updateStream', s)
      }
    },
    selectedCommit: {
      get() {
        if (!this.selectedBranch || !this.selectedBranch.commits) return null
        var commit = null
        //not set or latest, return first
        if (!this.savedStream.selectedCommitId || this.savedStream.selectedCommitId === 'latest')
          commit = this.selectedBranch.commits.items[0]
        //try match by id
        else {
          const index = this.selectedBranch.commits.items.findIndex(
            (x) => x.id === this.savedStream.selectedCommitId
          )
          if (index > -1) commit = this.selectedBranch.commits.items[index]
          else commit = this.selectedBranch.commits.items[0]
        }

        return commit
      },
      async set(value) {
        let s = { ...this.savedStream }
        const index = this.selectedBranch.commits.items.findIndex((x) => x.id === value.id)
        s.selectedCommitId = index === 0 ? 'latest' : value.id

        await this.initViewer()
        await this.viewer?.unloadAll()
        await this.viewer?.loadObject(
          `${this.serverUrl}/streams/${this.stream.id}/objects/${this.selectedBranch.commits.items[index].referencedObject}`
        )

        var iterator = Object.values(this.viewer.loaders).at(0).loader.getObjectIterator()
        console.log('it', iterator)
        this.objectIds = new Set()
        for await (const obj of iterator) {
          // TODO: not all visible objects have the displayValue prop (example lines)
          if (obj.hasOwnProperty('displayValue') && obj.displayValue !== null)
            this.objectIds.add(obj.id)
        }
        console.log('objectIds', this.objectIds)

        this.$store.dispatch('updateStream', s)
      }
    }
  },
  // created() {
  //   // this.savedStream = this.$store.currentStream
  //   this.isReceiver = true
  //   this.savedStream.selection = null
  //   this.savedStream.hasHeaders = false
  //   this.savedStream.selectedBranchName = null
  //   this.savedStream.selectedCommitId = null
  // },
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
            var range = sheet.getRange()
            var found = range.findOrNullObject(speckleId, {
              completeMatch: true, // Match the whole cell value.
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

            console.log(found?.address)
          })
        }
      })

      // highlight selected objects in viewer
      await window.Excel.run(async (context) => {
        var sheet = context.workbook.worksheets.getActiveWorksheet()
        sheet.onSelectionChanged.add(this.checkModelForSelection)
      })

      v.setLightConfiguration({
        enabled: true,
        castShadow: true,
        intensity: 5,
        color: 0xffffff,
        elevation: 1.33,
        azimuth: 0.75,
        radius: 0,
        indirectLightIntensity: 3,
        shadowcatcher: true
      })

      // v.loadObject(
      //   'https://latest.speckle.dev/streams/96765a5c41/objects/b5fd92623334e74a1fa2230b065ffe4d'
      // )
      // console.log('loaded')
      this.viewer = v
    },
    async checkModelForSelection(args) {
      if (!this.filterViewer) {
        this.filterViewer = true
        return
      }
      console.log('shut up, prettier', args)
      await window.Excel.run(async (context) => {
        // Get the selected range.
        let range = context.workbook.getSelectedRange()

        // Get the active cell in the workbook.
        let activeCell = context.workbook.getActiveCell()

        // Get the top-most cell of the current used range.
        // This method acts like the Ctrl+Up arrow key keyboard shortcut while a range is selected.
        let extendedRange = range.getExtendedRange(window.Excel.KeyboardDirection.right, activeCell)
        extendedRange.load('text')
        range.load('text')
        await context.sync()

        if (extendedRange.text == null) extendedRange = range
        var idsInViewer = new Array()
        for (let i = 0; i < extendedRange.text?.length; i++) {
          for (let j = 0; j < extendedRange.text[i].length; j++) {
            if (this.objectIds.has(extendedRange.text[i][j]))
              idsInViewer.push(extendedRange.text[i][j])
          }
        }

        // unisolate previous objects
        if (this.selectedObjectIds?.length > 0) {
          this.viewer?.resetFilters()
          this.viewer?.unIsolateObjects(this.selectedObjectIds)
          this.selectedObjectIds = null
        }

        if (idsInViewer.length > 0) {
          this.viewer?.isolateObjects(idsInViewer)
          this.selectedObjectIds = idsInViewer
          // this.viewer?.zoom(idsInViewer)
        }
      })
    },
    swapReceiver() {
      this.isReceiver = !this.isReceiver
      // let s = { ...this.savedStream }
      // if (s.isReceiver != true && s.isReceiver != false) s.isReceiver = true
      // else s.isReceiver = !s.isReceiver
      this.$mixpanel.track('Connector Action', { name: 'Stream Swap Receive/Send', type: 'action' })
      // this.$store.dispatch('updateStream', s)
    },

    async setRange(headers) {
      await window.Excel.run(async (context) => {
        let range = context.workbook.getSelectedRange()
        range.load('address')

        await context.sync()

        let s = { ...this.savedStream }
        s.selection = range.address
        s.hasHeaders = headers
        this.$store.dispatch('updateStream', s)
      })
    },
    clearSelection() {
      let s = { ...this.savedStream }
      s.selection = ''
      this.$store.dispatch('updateStream', s)
    },

    remove() {
      this.$mixpanel.track('Connector Action', { name: 'Stream Remove' })
      return this.$store.dispatch('removeStream', this.savedStream.id)
    },
    cancel() {
      ac.abort()
    },
    async send() {
      this.$mixpanel.track('Send')
      send(this.savedStream, this.stream.id, this.selectedBranch.name, this.message)
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
    // async filterAndReceive() {
    //   // this.$store.dispatch('login', this.serverUrl)
    //   await window.Office.context.ui.displayDialogAsync(
    //     `${window.location.origin}/redirect`,
    //     {
    //       height: 80,
    //       width: 30,
    //       promptBeforeOpen: false
    //     },
    //     (asyncResult) => {
    //       let dialog = asyncResult.value
    //       dialog.addEventHandler(window.Office.EventType.DialogMessageReceived, async (args) => {
    //         // dialog.close()
    //         console.log(args)
    //         router.push(
    //           `${window.location.origin}/streams/${this.stream.id}/commits/${this.selectedCommit.id}`
    //         )
    //       })
    //     }
    //   )
    // },
    formatCommitName(id) {
      if (this.selectedBranch.commits.items[0].id == id) {
        // this.viewer.unloadAll()
        // this.viewer.loadObject(
        //   `${this.serverUrl}/streams/${this.streamId}/objects/${this.selectedCommit.referencedObject}`
        // )
        console.log(id)
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
#stream-info {
  /* max-width: 600px; */
  /* left: 50%;
  transform: translateX(-50%); */
  position: absolute;
  left: 0;
  right: 0;
  margin: 0 auto;
  bottom: 0px;
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
</style>

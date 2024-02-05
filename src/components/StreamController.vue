<template>
  <v-card id="stream-info" class="pa-5 ma-3" style="transition: all 0.2s">
    <v-row>
      <v-col class="align-self-center">
        <div class="subtitle-1">
          {{ stream.name }}
        </div>

        <div class="floating">
          <v-btn
            v-tooltip="`Open this stream in a new window`"
            small
            icon
            color="primary"
            :href="commitViewUrl()"
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
          <span v-if="selection" v-tooltip="selection" class="mt-2 ml-2 text-truncate">
            {{ selection }}
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
              <v-list-item v-if="selection" @click="clearSelection">
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
        <v-btn
          v-if="determinedConversion"
          color="primary"
          class="lower"
          v-bind="attrs"
          small
          @click="receiveDeterminedConversion"
        >
          <v-img class="mr-2" width="30" height="30" src="../assets/ReceiverWhite@32.png" />
          Receive {{ determinedConversion }}
        </v-btn>
        <v-menu v-else top offset-y>
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
              Receive {{ determinedConversion }}
            </v-btn>
          </template>

          <v-list v-if="selectedCommit" dense>
            <!-- <v-list-item :to="`/streams/${stream.id}/commits/${selectedCommit.id}`"> -->
            <v-list-item @click="filterAndReceive">
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
        <v-btn color="primary" small :disabled="!selection" class="mt-1" @click="send">
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
  </v-card>
</template>
<script>
import { send, receiveLatest, bakeSchedule } from '../plugins/excel'
import { getReferencedObject } from '../plugins/excel'

let ac = new AbortController()

export default {
  props: {
    stream: {
      type: Object,
      default: null
    },
    determinedConversion: {
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
      selectedBranchName: null,
      selectedCommitId: null,
      isReceiver: true,
      selection: null,
      hasHeaders: false,
      receiverSelection: null
    }
  },
  computed: {
    serverUrl() {
      return this.$store.getters.serverUrl
    },
    selectedBranch: {
      get() {
        if (!this.stream || !this.stream.branches) return null

        let selectedBranchName = this.selectedBranchName ? this.selectedBranchName : 'main'
        const index = this.stream.branches.items.findIndex((x) => x.name === selectedBranchName)
        if (index > -1) return this.stream.branches.items[index]
        return this.stream.branches.items[0]
      },
      set(value) {
        this.selectedBranchName = value.name
        this.$emit('loadByReferencedId', this.selectedBranch.commits.items[0].referencedObject)
        this.$store.dispatch('updateStream', this.savedStream)
      }
    },
    selectedCommit: {
      get() {
        if (!this.selectedBranch || !this.selectedBranch.commits) return null
        var commit = null
        //not set or latest, return first
        if (!this.selectedCommitId || this.selectedCommitId === 'latest')
          commit = this.selectedBranch.commits.items[0]
        //try match by id
        else {
          const index = this.selectedBranch.commits.items.findIndex(
            (x) => x.id === this.selectedCommitId
          )
          if (index > -1) commit = this.selectedBranch.commits.items[index]
          else commit = this.selectedBranch.commits.items[0]
        }
        return commit
      },
      async set(value) {
        const index = this.selectedBranch.commits.items.findIndex((x) => x.id === value.id)
        this.selectedCommitId = value.id
        this.$emit('loadByReferencedId', this.selectedBranch.commits.items[index].referencedObject)
        this.$store.dispatch('updateStream', this.savedStream)
      }
    },
    savedStream() {
      return {
        id: this.stream.Id,
        isReceiver: this.isReceiver,
        selection: this.selection,
        hasHeaders: this.hasHeaders,
        selectedBranchName: this.selectedBranchName,
        selectedCommitId: this.selectedCommitId,
        receiverSelection: this.receiverSelection
      }
    }
  },
  mounted() {
    this.$nextTick(function () {
      this.$emit('loadByReferencedId', this.selectedCommit.referencedObject)
    })
  },
  methods: {
    commitViewUrl() {
      if (this.$store.getters.isFE2) {
        if (this.selectedCommit && this.selectedCommit.id) {
          return `${this.serverUrl}/projects/${this.stream.id}/models/${this.selectedBranch.id}@${this.selectedCommit.id}`
        } else {
          return `${this.serverUrl}/projects/${this.stream.id}/models/${this.selectedBranch.id}`
        }
      } else {
        return `${this.serverUrl}/streams/${this.stream.id}/branches/${this.selectedBranch.name}`
      }
    },
    swapReceiver() {
      this.isReceiver = !this.isReceiver
      this.$emit('loadByCommitId', this.selectedCommitId)
      this.$store.dispatch('updateStream', this.savedStream)
      this.$mixpanel.track('Connector Action', { name: 'Stream Swap Receive/Send', type: 'action' })
    },
    async filterAndReceive() {
      this.$store.dispatch('addStream', this.savedStream)
      this.$router.push(`/streams/${this.stream.id}/commits/${this.selectedCommit.id}`)
    },
    async setRange(headers) {
      await window.Excel.run(async (context) => {
        let range = context.workbook.getSelectedRange()
        range.load('address')

        await context.sync()

        this.selection = range.address
        this.hasHeaders = headers
        this.$store.dispatch('updateStream', this.savedStream)
      })
    },
    clearSelection() {
      this.selection = ''
      this.$store.dispatch('updateStream', this.savedStream)
    },
    remove() {
      this.$mixpanel.track('Connector Action', { name: 'Stream Remove' })
      return this.$store.dispatch('removeStream', this.savedStream.id)
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
      send(this.savedStream, this.stream.id, this.selectedBranch.name, this.message)
    },
    async receiveDeterminedConversion() {
      let data = await getReferencedObject(this.stream.id, this.selectedCommit.referencedObject, {})
      let ac = new AbortController()
      if (this.determinedConversion == 'Schedule') {
        this.receiverSelection = await bakeSchedule(
          data,
          this.stream.id,
          this.selectedCommit.id,
          this.selectedCommit.message,
          ac.signal,
          null, // nearestObjectId,
          null, // pathFromNearestObj,
          null, // previousHeaders,
          null // previousRange
        )
      } else {
        this.$emit('clearDeterminedConversion')
      }

      if (this.receiverSelection) {
        this.$store.dispatch('setReceiverSelection', {
          id: this.stream.id,
          receiverSelection: this.receiverSelection
        })
      }
    },
    async receiveLatest() {
      this.$mixpanel.track('Receive')
      ac = new AbortController()

      console.log(this.receiverSelection)

      this.progress = true
      await receiveLatest(
        this.selectedCommit.referencedObject,
        this.stream.id,
        this.selectedCommit.id,
        this.selectedCommit.message,
        this.receiverSelection,
        ac.signal
      )
      this.progress = false
    },
    formatCommitName(id) {
      if (this.selectedBranch.commits.items[0].id == id) {
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

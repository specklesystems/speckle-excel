<template>
  <div>
    <div v-if="$apollo.loading" class="mx-5">
      <v-skeleton-loader type="card, article"></v-skeleton-loader>
    </div>
    <v-card v-if="stream" class="pa-5 mb-3" style="transition: all 0.2s">
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
              :href="serverUrl + `/streams/` + stream.id"
              target="_blank"
            >
              <v-icon small>mdi-open-in-new</v-icon>
            </v-btn>

            <v-btn
              v-tooltip="`Click to make this a ` + (savedStream.isReceiver ? `sender` : `receiver`)"
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
          <div v-if="savedStream.isReceiver">
            <v-select
              v-if="
                selectedBranch && selectedBranch.commits && selectedBranch.commits.items.length > 0
              "
              v-model="selectedCommit"
              :items="selectedBranch.commits.items"
              item-value="message"
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
      <v-row v-if="savedStream.isReceiver">
        <v-col class="align-self-center">
          <v-btn
            v-if="selectedCommit"
            color="primary"
            class="lower"
            small
            :to="`/streams/${stream.id}/commits/${selectedCommit.id}`"
          >
            <v-img class="mr-2" width="30" height="30" src="../assets/ReceiverWhite@32.png" />

            Receive
          </v-btn>
          <!-- hack to show the button disdabled without vue complaining of invalid selectedCommit.id -->
          <v-btn v-else color="primary" small disabled>
            <v-img class="mr-2" width="30" height="30" src="../assets/ReceiverWhite@32.png" />
            Receive
          </v-btn>
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
            class="pt-0 mt-0 ml-3"
            label="Message"
            placeholder="Data from Excel"
          ></v-text-field>
        </v-col>
      </v-row>
    </v-card>
  </div>
</template>
<script>
import streamQuery from '../graphql/stream.gql'
const unflatten = require('flat').unflatten

export default {
  props: {
    savedStream: {
      type: Object,
      default: null
    }
  },
  data() {
    return {
      message: ''
    }
  },
  apollo: {
    stream: {
      prefetch: true,
      query: streamQuery,
      variables() {
        return {
          id: this.savedStream.id
        }
      },
      skip() {
        return this.savedStream === null
      }
      // result() {
      //   if (this.stream && this.stream.branches) {
      //     this.selectedBranch = this.stream.branches.items[this.stream.branches.items.length - 1]
      //   }
      // }
    }
  },
  computed: {
    serverUrl() {
      return this.$store.getters.serverUrl
    },
    selectedBranch: {
      get() {
        return this.savedStream.selectedBranch
      },
      // setter
      set(value) {
        let s = { ...this.savedStream }
        s.selectedBranch = value
        if (value.commits.items.length > 0) s.selectedCommit = value.commits.items[0]
        else s.selectedCommit = null

        this.$store.dispatch('updateStream', s)
      }
    },
    selectedCommit: {
      get() {
        return this.savedStream.selectedCommit
      },
      // setter
      set(value) {
        let s = { ...this.savedStream }
        s.selectedCommit = value
        this.$store.dispatch('updateStream', s)
      }
    }
  },
  methods: {
    swapReceiver() {
      let s = { ...this.savedStream }
      s.isReceiver = !s.isReceiver
      this.$store.dispatch('updateStream', s)
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
      return this.$store.dispatch('removeStream', this.stream)
    },
    async send() {
      window.Excel.run(async (context) => {
        let sheet = context.workbook.worksheets.getItem(this.savedStream.selection.split('!')[0])
        let range = sheet.getRange(this.savedStream.selection)
        range.load('values')
        await context.sync()
        let values = range.values

        let data = []
        if (this.savedStream.hasHeaders) {
          for (let row = 1; row < values.length; row++) {
            let object = {}
            for (let col = 0; col < values[0].length; col++) {
              let propName = values[0][col]
              if (propName !== 'id' && propName.endsWith('.id')) continue
              let propValue = values[row][col]
              object[propName] = propValue
            }
            let unlattened = unflatten(object, { object: true })

            data.push(unlattened)
          }
        } else {
          for (let row = 0; row < values.length; row++) {
            let rowArray = []
            for (let col = 0; col < values[0].length; col++) {
              rowArray.push(values[row][col])
            }
            data.push(rowArray)
          }
        }

        await this.$store.dispatch('createCommit', {
          object: data,
          streamId: this.stream.id,
          branchName: this.selectedBranch.name,
          message: this.message
        })
      })
    },
    formatCommitName(id) {
      if (this.selectedBranch.commits.items[0].id == id) return 'latest'
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
</style>

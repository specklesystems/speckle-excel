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
                <v-list-item @click="setSelection">
                  <v-list-item-title class="caption">Set range with headers</v-list-item-title>
                </v-list-item>
                <v-list-item @click="setSelection">
                  <v-list-item-title class="caption">Set range</v-list-item-title>
                </v-list-item>
                <v-list-item @click="selection = null">
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
          <v-btn color="primary" small :disabled="!selection" class="mt-1" @click="send">
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
      selectedBranch: null,
      selectedCommit: null,
      selection: null,
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
      },
      result() {
        if (this.stream && this.stream.branches) {
          this.selectedBranch = this.stream.branches.items[0]
        }
      }
    }
  },
  computed: {
    serverUrl() {
      return this.$store.getters.serverUrl
    }
  },
  watch: {
    // '$route.params.branchName': {
    //   handler: function (to, from) {
    //     this.selectBranch()
    //   },
    //   deep: true,
    //   immediate: true
    // },
    selectedBranch() {
      if (this.selectedBranch.commits.items.length > 0)
        this.selectedCommit = this.selectedBranch.commits.items[0]
      else this.selectedCommit = null
    }
  },
  methods: {
    swapReceiver() {
      let s = { ...this.savedStream }
      s.isReceiver = !s.isReceiver
      this.$store.dispatch('updateStream', s)
    },
    async send() {
      window.Excel.run(async (context) => {
        let sheet = context.workbook.worksheets.getItem(this.selection.split('!')[0])
        let range = sheet.getRange(this.selection)
        range.load('values')
        await context.sync()
        let values = range.values

        let data = []
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

        await this.$store.dispatch('createCommit', {
          object: data,
          streamId: this.stream.id,
          branchName: this.selectedBranch.name,
          message: this.message
        })

        //        let response = await fetch(`${SERVER_URL}/graphql`, {
        //   method: 'POST',
        //   headers: {
        //     Authorization: 'Bearer ' + token,
        //     'Content-Type': 'application/json'
        //   },
        //   body: JSON.stringify({
        //     query: query
        //   })
        // })
      })
    },
    formatCommitName(id) {
      if (this.selectedBranch.commits.items[0].id == id) return 'latest'
      return id
    },
    async setSelection() {
      window.Excel.run(async (context) => {
        let range = context.workbook.getSelectedRange()
        range.load('address')

        await context.sync()
        this.selection = range.address
      })
    },

    remove() {
      return this.$store.dispatch('removeStream', this.stream)
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

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
              v-tooltip="`Click to make this a ` + (isReceiver ? `sender` : `receiver`)"
              small
              icon
              color="primary"
              @click="isReceiver = !isReceiver"
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
      <v-row v-if="isReceiver">
        <v-col class="align-self-center">
          <v-btn
            v-if="selectedCommit"
            color="primary"
            small
            :to="`/streams/${streamId}/commits/${selectedCommit.id}`"
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
        <v-col class="align-self-center">
          <v-btn color="primary" small :disabled="!selection">
            <v-img class="mr-2" width="30" height="30" src="../assets/SenderWhite@32.png" />

            Send
          </v-btn>
        </v-col>
      </v-row>
    </v-card>
  </div>
</template>
<script>
import streamQuery from '../graphql/stream.gql'

export default {
  props: {
    streamId: {
      type: String,
      default: null
    }
  },
  data() {
    return {
      selectedBranch: null,
      selectedCommit: null,
      isReceiver: true,
      selection: null
    }
  },
  apollo: {
    stream: {
      prefetch: true,
      query: streamQuery,
      variables() {
        return {
          id: this.streamId
        }
      },
      skip() {
        return this.streamId === null
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
    changeBranch() {
      this.clearRendererTrigger += 42
      this.$router.push({
        path:
          '/streams/' +
          this.$route.params.streamId +
          '/branches/' +
          encodeURIComponent(this.selectedBranch.name)
      })
    },
    remove() {
      return this.$store.dispatch('removeStream', this.streamId)
    }
  }
}
</script>
<style>
.stream-card-select .v-text-field__details {
  display: none !important;
}
.v-btn {
  text-transform: none;
}
.floating {
  position: absolute;
  top: 0;
  right: 0;
  margin: 10px;
}
</style>

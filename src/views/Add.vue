<template>
  <v-container>
    <v-row align="center">
      <v-col cols="12" align="center" class="mt-5">
        <p v-if="search" class="subtitle">No streams found 🧐</p>
        <div v-else-if="!$apollo.loading && filteredStreams && filteredStreams.length == 0">
          <p class="subtitle">
            You don't have any streams 😟,
            <a :href="serverUrl" target="_blank">visit Speckle web to create one</a>
            !
          </p>
        </div>
      </v-col>
    </v-row>

    <v-row align="center" class="my-0 py-0">
      <v-col cols="12" class="my-0 py-0" align="center">
        <v-text-field
          v-model="search"
          rounded
          filled
          clearable
          label="Search"
          class="mx-5 search"
          prepend-inner-icon="mdi-magnify"
        ></v-text-field>
      </v-col>
    </v-row>

    <create-stream-dialog :account-id="user.id" :server-url="serverUrl" />

    <v-row class="mt-0 pt-0">
      <v-col cols="12" class="mt-0 pt-0">
        <v-card elevation="0" color="transparent">
          <div v-if="$apollo.loading" class="mx-4">
            <v-skeleton-loader class="mt-3" type="article"></v-skeleton-loader>
            <v-skeleton-loader class="mt-3" type="article"></v-skeleton-loader>
            <v-skeleton-loader class="mt-3" type="article"></v-skeleton-loader>
          </div>
          <v-card-text v-if="streams" class="mt-0 pt-3">
            <div v-for="(stream, i) in filteredStreams" :key="i">
              <list-item-stream :stream="stream"></list-item-stream>
            </div>
            <infinite-loading
              v-if="streams && streams.items && streams.items.length < streams.totalCount"
              @infinite="infiniteHandler"
            >
              <div slot="no-more">These are all your streams!</div>
              <div slot="no-results">There are no streams to load</div>
            </infinite-loading>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import ListItemStream from '../components/ListItemStream'
import gql from 'graphql-tag'
import streamsQuery from '../graphql/streams.gql'
import InfiniteLoading from 'vue-infinite-loading'
import { createClient } from '../vue-apollo'
import CreateStreamDialog from '../components/dialogs/CreateStreamDialog.vue'

export default {
  name: 'Add',

  components: {
    ListItemStream,
    InfiniteLoading,
    CreateStreamDialog
  },
  data: () => ({
    streams: [],
    search: ''
  }),
  apollo: {
    $client: createClient(),
    streams: {
      prefetch: true,
      query: streamsQuery,
      fetchPolicy: 'cache-and-network', //https://www.apollographql.com/docs/react/data/queries/
      variables() {
        return {
          query: this.search
        }
      },
      skip() {
        return this.search && this.search.length > 0 && this.search.length < 3
      },
      debounce: 300
    },
    $subscribe: {
      userStreamAdded: {
        query: gql`
          subscription {
            userStreamAdded
          }
        `,
        result() {
          this.$apollo.queries.streams.refetch()
        },
        skip() {
          return !this.user
        }
      },
      userStreamRemoved: {
        query: gql`
          subscription {
            userStreamRemoved
          }
        `,
        result() {
          this.$apollo.queries.streams.refetch()
        }
        // skip() {
        //   return !this.isAuthenticated
        // }
      }
    }
  },
  computed: {
    isAuthenticated() {
      console.log(this.user)
      return this.$store.getters.isAuthenticated
    },
    user() {
      return this.$store.state.user.user
    },
    serverUrl() {
      return this.$store.getters.serverUrl
    },
    filteredStreams() {
      console.log('user', this.$store.state.user.user)
      if (!this.streams.items) return null
      return this.streams.items.filter(
        (x) => this.$store.state.streams.streams.findIndex((y) => y.id === x.id) === -1
      )
    }
  },
  mounted() {
    this.$mixpanel.track('Connector Action', { name: 'Stream List' })
  },
  methods: {
    infiniteHandler($state) {
      this.$apollo.queries.streams.fetchMore({
        variables: {
          cursor: this.streams.cursor
        },
        // Transform the previous result with new data
        updateQuery: (previousResult, { fetchMoreResult }) => {
          const newItems = fetchMoreResult.streams.items

          //set vue-infinite state
          if (newItems.length === 0) $state.complete()
          else $state.loaded()

          return {
            streams: {
              __typename: previousResult.streams.__typename,
              totalCount: fetchMoreResult.streams.totalCount,
              cursor: fetchMoreResult.streams.cursor,
              // Merging the new streams
              items: [...previousResult.streams.items, ...newItems]
            }
          }
        }
      })
    }
  }
}
</script>
<style>
.search .v-text-field__details {
  display: none !important;
}
</style>

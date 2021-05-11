<template>
  <v-container>
    <v-row align="center">
      <v-col cols="12" align="center" class="mt-5">
        <span class="subtitle">Click on a stream to add it to this document. 👇</span>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <v-card elevation="0" color="transparent">
          <div v-if="$apollo.loading" class="mx-5">
            <v-skeleton-loader type="card, article, article"></v-skeleton-loader>
          </div>
          <v-card-text v-if="streams && streams.items" class="mt-0 pt-3">
            <div v-for="(stream, i) in streams.items" :key="i">
              <list-item-stream :stream="stream"></list-item-stream>
            </div>
            <infinite-loading
              v-if="streams.items.length < streams.totalCount"
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

export default {
  name: 'Add',

  components: {
    ListItemStream,
    InfiniteLoading
  },
  data: () => ({
    streams: []
  }),
  apollo: {
    streams: {
      prefetch: true,
      query: streamsQuery,
      fetchPolicy: 'cache-and-network' //https://www.apollographql.com/docs/react/data/queries/
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
      return this.$store.getters.isAuthenticated
    }
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

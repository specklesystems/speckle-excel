<template>
  <v-card class="pa-5 mb-3" style="transition: all 0.2s">
    <div v-if="$apollo.loading" class="mx-5">
      <v-skeleton-loader type="card, article"></v-skeleton-loader>
    </div>

    <v-row v-if="stream">
      <v-col cols="12" sm="8" class="align-self-center">
        <div class="subtitle-1">
          {{ stream.name }}
        </div>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="6" class="align-self-center">
        <v-select
          v-if="stream && stream.branches"
          v-model="selectedBranch"
          :items="stream.branches.items"
          item-value="name"
          solo
          flat
          style="width: 100%"
          dense
          return-object
          background-color="background"
          class="d-inline-block mb-0 pb-0"
        >
          <template #selection="{ item }">
            <v-icon small class="mr-1">mdi-source-branch</v-icon>
            <span class="text-truncate caption">{{ item.name }}</span>
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
      <v-col cols="6" class="align-self-center">
        <v-select
          v-if="selectedBranch && selectedBranch.commits"
          v-model="selectedCommit"
          :items="selectedBranch.commits.items"
          item-value="message"
          solo
          flat
          dense
          style="width: 100%"
          return-object
          background-color="background"
          class="d-inline-block mb-0 pb-0"
        >
          <template #selection="{ item }">
            <v-icon small class="mr-1">mdi-source-commit</v-icon>
            <span class="text-truncate caption">{{ commitName(item.id) }}</span>
          </template>
          <template #item="{ item }">
            <div class="pa-2">
              <p class="pa-0 ma-0 caption">
                {{ item.id }}
                <span v-if="commitName(item.id) == 'latest'">(latest)</span>
              </p>
              <p class="caption pa-0 ma-0 grey--text font-weight-light">
                {{ item.message }}
              </p>
            </div>
          </template>
        </v-select>
      </v-col>
    </v-row>
  </v-card>
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
      selectedCommit: null
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
  computed: {},
  watch: {
    // '$route.params.branchName': {
    //   handler: function (to, from) {
    //     this.selectBranch()
    //   },
    //   deep: true,
    //   immediate: true
    // },
    selectedBranch() {
      this.selectedCommit = this.selectedBranch.commits.items[0]
    }
  },
  methods: {
    commitName(id) {
      if (this.selectedBranch.commits.items[0].id == id) return 'latest'
      return id
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
    }
  }
}
</script>

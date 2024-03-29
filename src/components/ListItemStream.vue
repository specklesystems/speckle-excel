<template>
  <v-card class="px-5 py-2 mb-3" style="transition: all 0.2s" @click="openStream">
    <v-row>
      <v-col cols="12" sm="8" class="align-self-center">
        <div class="text-h6">
          {{ stream.name }}
        </div>
        <div class="caption mb-2 mt-1 text-truncate">
          {{ stream.description }}
        </div>

        <div>
          <span class="caption mb-2 font-italic">
            Updated
            <timeago :datetime="stream.updatedAt"></timeago>
          </span>
          <v-chip small outlined class="ml-3">
            <v-icon small left>mdi-account-key-outline</v-icon>
            {{ role }}
          </v-chip>
          <v-chip
            v-tooltip="`${stream.branches.totalCount === 1 ? '1 model' : 'models'}`"
            outlined
            class="ml-2"
            small
          >
            <v-icon small class="mr-2 float-left">mdi-source-branch</v-icon>
            {{ stream.branches.totalCount }}
          </v-chip>

          <v-chip
            v-tooltip="`${stream.commits.totalCount === 1 ? '1 version' : 'versions'}`"
            outlined
            class="ml-2"
            small
          >
            <v-icon small class="mr-2 float-left">mdi-source-commit</v-icon>
            {{ stream.commits.totalCount }}
          </v-chip>
        </div>
      </v-col>
      <v-col cols="12" sm="4" class="text-sm-center text-md-right align-self-center pt-0">
        <div>
          <span v-for="user in collaboratorsSlice" :key="user.id">
            <user-avatar
              v-if="user.id"
              :id="user.id"
              :avatar="user.avatar"
              :size="30"
              :name="user.name"
            />
          </span>

          <div v-if="stream.collaborators.length > collaboratorsSlice.length" class="d-inline">
            <v-avatar class="ma-1 grey--text text--darken-2" color="grey lighten-3" size="30">
              <b>+{{ stream.collaborators.length - collaboratorsSlice.length }}</b>
            </v-avatar>
          </div>
        </div>
      </v-col>
    </v-row>
  </v-card>
</template>
<script>
import UserAvatar from '../components/UserAvatar'

export default {
  components: { UserAvatar },
  props: {
    stream: {
      type: Object,
      default: function () {
        return {}
      }
    }
  },
  computed: {
    collaboratorsSlice() {
      let limit = 6
      switch (this.$vuetify.breakpoint.name) {
        case 'xs':
          limit = 5
          break
        case 'sm':
          limit = 5
          break
        case 'md':
          limit = 4
          break
        case 'lg':
          limit = 6
          break
        case 'xl':
          limit = 6
          break
      }

      if (this.stream.collaborators.length > limit)
        return this.stream.collaborators.slice(0, limit - 1)
      return this.stream.collaborators
    },
    role() {
      return this.stream.role.replace('stream:', '')
    }
  },
  methods: {
    addStream() {
      this.$mixpanel.track('Connector Action', { name: 'Stream Add' })

      this.$store.dispatch('addStream', {
        id: this.stream.id,
        isReceiver: true,
        selection: null,
        hasHeaders: false,
        selectedBranchName: null,
        selectedCommitId: null
      })
      this.$router.push('/')
    },
    openStream() {
      this.$router.push(`/streams/${this.stream.id}`)
    }
  }
}
</script>

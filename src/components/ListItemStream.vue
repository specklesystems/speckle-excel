<template>
  <v-card class="pa-5 mb-3" style="transition: all 0.2s" @click="openStream">
    <v-row>
      <v-col cols="12" sm="8" class="align-self-center">
        <div class="subtitle-1">
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
            v-tooltip="
              stream.branches.totalCount +
              ' branch' +
              (stream.branches.totalCount === 1 ? '' : 'es')
            "
            outlined
            class="ml-2"
            small
          >
            <v-icon small class="mr-2 float-left">mdi-source-branch</v-icon>
            {{ stream.branches.totalCount }}
          </v-chip>

          <v-chip
            v-tooltip="
              stream.commits.totalCount + ' commit' + (stream.commits.totalCount === 1 ? '' : 's')
            "
            outlined
            class="ml-2"
            small
          >
            <v-icon small class="mr-2 float-left">mdi-source-commit</v-icon>
            {{ stream.commits.totalCount }}
          </v-chip>
        </div>
      </v-col>
      <v-col cols="12" sm="4" class="text-sm-center text-md-right align-self-center">
        <div>
          <user-avatar
            v-for="user in collaboratorsSlice"
            :id="user.id"
            :key="user.id"
            :avatar="user.avatar"
            :size="30"
            :name="user.name"
          />
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
      let limit = 18
      switch (this.$vuetify.breakpoint.name) {
        case 'xs':
          limit = 10
          break
        case 'sm':
          limit = 9
          break
        case 'md':
          limit = 8
          break
        case 'lg':
          limit = 12
          break
        case 'xl':
          limit = 18
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
      this.$store.currentStream = this.stream
      this.$router.push(`/streams/${this.stream.id}`)
    }
  }
}
</script>

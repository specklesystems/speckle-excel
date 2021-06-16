<template>
  <v-container>
    <v-row align="center">
      <v-col cols="12" align="center" class="mt-5">
        <span v-if="streams && streams.length > 0" class="subtitle">
          You have {{ streams.length }} stream{{ streams.length === 1 ? '' : 's' }}
          in this document 🙌
        </span>

        <div v-else>
          <p class="subtitle">You have no streams in this document</p>
          <v-btn large class="mt-5" color="primary" to="add">Add a stream</v-btn>
        </div>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <v-card elevation="0" color="transparent">
          <v-card-text class="mt-0 pt-3">
            <div v-for="stream in streams" :key="stream.id">
              <stream-card :saved-stream="stream"></stream-card>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import StreamCard from '../components/StreamCard'

export default {
  name: 'Streams',

  components: {
    StreamCard
  },
  computed: {
    streams() {
      if (!this.$store.state) return []
      return this.$store.state.streams.streams
    }
  },
  methods: {}
}
</script>

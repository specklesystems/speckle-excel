<template>
  <v-container>
    <v-row align="center">
      <v-col cols="12" align="center" class="mt-5">
        <span class="subtitle">
          You have {{ streams.length === 0 ? 'no' : streams.length }} stream{{
            streams.length === 1 ? '' : 's'
          }}
          in this document 🙌
        </span>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <v-card elevation="0" color="transparent">
          <v-card-text class="mt-0 pt-3">
            <div v-for="(stream, i) in streams" :key="i">
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
  mounted() {},
  methods: {}
}
</script>

<template>
  <v-container style="height: 100%">
    <v-row align="center" style="height: 100%">
      <v-col class="py-2" align="center">
        <span class="subtitle">
          Hello! I'm a new window 👋
          <br />
          Click the button below to log in or register.
          <br />
          👇
        </span>
        <br />
        <v-btn large class="mt-5" color="primary" @click="redirect">Log in</v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>
<script>
export default {
  name: 'Redirect',
  mounted() {
    this.$store.dispatch('redirect')
  },

  methods: {
    redirect() {
      this.$store.dispatch('redirect')
    }
  }
}
</script>

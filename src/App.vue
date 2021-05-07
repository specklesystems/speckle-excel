<template>
  <v-app>
    <v-app-bar app color="primary" dark>
      <div class="d-flex align-center">
        <v-img
          alt="Speckle Logo"
          class="shrink mr-2"
          contain
          :src="require(`@/assets/logo.png`)"
          transition="scale-transition"
          width="40"
          height="24"
        />
        <h3>EXCEL CONNECTOR</h3>
      </div>

      <v-spacer></v-spacer>

      <v-btn v-if="!isAuthenticated" outlined @click="$store.dispatch('redirectToAuth')">
        <span>Login with Speckle</span>
      </v-btn>
      <v-btn v-else outlined @click="$store.dispatch('logout')">Log out</v-btn>
    </v-app-bar>

    <v-main>
      <HelloWorld />
    </v-main>
  </v-app>
</template>

<script>
import HelloWorld from './components/HelloWorld'

export default {
  name: 'App',
  components: {
    HelloWorld
  },

  data: () => ({
    //
  }),
  computed: {
    isAuthenticated() {
      return this.$store.getters.isAuthenticated
    }
  },
  mounted() {
    console.log(this.$route.query)
    if (this.$route.query.access_code)
      this.$store.dispatch('exchangeAccessCode', this.$route.query.access_code)
  }
}
</script>

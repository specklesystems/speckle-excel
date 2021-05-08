<template>
  <v-app>
    <v-app-bar app color="primary" dark>
      <v-img contain max-height="30" max-width="30" src="./assets/logo.png" />
      <v-toolbar-title style="margin-top: -4px">
        <span class="white--text caption"><b>SPECKLE</b></span>
        &nbsp;
        <span class="caption">EXCEL</span>
      </v-toolbar-title>

      <v-spacer></v-spacer>
      <div v-if="user">
        <span class="mr-5">Welcome {{ user.name }}!</span>
        <v-btn outlined @click="$store.dispatch('logout')">
          <span>Log out</span>
        </v-btn>
      </div>
    </v-app-bar>

    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script>
export default {
  name: 'App',

  data: () => ({
    //
  }),
  computed: {
    isAuthenticated() {
      return this.$store.getters.isAuthenticated
    },
    user() {
      return this.$store.state.user
    }
  },
  mounted() {
    this.$store.dispatch('login', this.$route.query)
  }
}
</script>

<template>
  <v-container style="height: 100%">
    <v-row align="center" style="height: 100%">
      <v-col class="py-2" align="center">
        <span class="subtitle">
          Hello!
          <br />
          Welcome to the Speckle connector for Excel 📊
          <br />
          <br />
        </span>
        <span class="caption">
          Please login or register below to start streaming data.
          <br />
          New here? Make sure to
          <a href="https://speckle.guide/user/excel.html" target="_blank">check our docs!</a>
          📚
          <br />
        </span>
        <span class="subtitle">👇</span>
        <br />

        <v-btn large class="mt-5" color="primary" @click="login">Login</v-btn>
        <span class="caption">
          <br />
        </span>
      </v-col>
    </v-row>
  </v-container>
</template>
<script>
export default {
  name: 'Login',

  methods: {
    login() {
      this.$store.dispatch('login')
    }
  }
}
</script>

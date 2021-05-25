<template>
  <v-container style="height: 100%">
    <v-row align="center" style="height: 100%">
      <v-col class="py-2" align="center">
        <span class="subtitle">
          Hello,
          <br />
          welcome to the Speckle connector for Excel! 📊
          <br />
        </span>
        <span class="caption">
          Please login or register below, a Speckle account is needed to use this plugin.
          <br />
        </span>
        <span class="subtitle">👇</span>
        <br />
        <v-btn large class="mt-5" color="primary" @click="login">Open login window</v-btn>
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

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
        <!-- <span class="mr-5">Welcome {{ user.name }}!</span> -->
        <v-btn outlined @click="$store.dispatch('logout')">
          <span>Log out</span>
        </v-btn>
      </div>
    </v-app-bar>

    <v-main :style="background">
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
    },
    background() {
      let theme = this.$vuetify.theme.dark ? 'dark' : 'light'
      return `background-color: ${this.$vuetify.theme.themes[theme].background};`
    }
  },
  mounted() {
    console.log(this.$route)
    this.$store.dispatch('login', this.$route.query)
  }
}
</script>
<style>
/* TOOLTIPs */

.tooltip {
  display: block !important;
  z-index: 10000;
  font-family: 'Roboto', sans-serif !important;
  font-size: 0.75rem !important;
}

.tooltip .tooltip-inner {
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border-radius: 16px;
  padding: 5px 10px 4px;
}

.tooltip .tooltip-arrow {
  width: 0;
  height: 0;
  border-style: solid;
  position: absolute;
  margin: 5px;
  border-color: rgba(0, 0, 0, 0.5);
  z-index: 1;
}

.tooltip[x-placement^='top'] {
  margin-bottom: 5px;
}

.tooltip[x-placement^='top'] .tooltip-arrow {
  border-width: 5px 5px 0 5px;
  border-left-color: transparent !important;
  border-right-color: transparent !important;
  border-bottom-color: transparent !important;
  bottom: -5px;
  left: calc(50% - 5px);
  margin-top: 0;
  margin-bottom: 0;
}

.tooltip[x-placement^='bottom'] {
  margin-top: 5px;
}

.tooltip[x-placement^='bottom'] .tooltip-arrow {
  border-width: 0 5px 5px 5px;
  border-left-color: transparent !important;
  border-right-color: transparent !important;
  border-top-color: transparent !important;
  top: -5px;
  left: calc(50% - 5px);
  margin-top: 0;
  margin-bottom: 0;
}

.tooltip[x-placement^='right'] {
  margin-left: 5px;
}

.tooltip[x-placement^='right'] .tooltip-arrow {
  border-width: 5px 5px 5px 0;
  border-left-color: transparent !important;
  border-top-color: transparent !important;
  border-bottom-color: transparent !important;
  left: -5px;
  top: calc(50% - 5px);
  margin-left: 0;
  margin-right: 0;
}

.tooltip[x-placement^='left'] {
  margin-right: 5px;
}

.tooltip[x-placement^='left'] .tooltip-arrow {
  border-width: 5px 0 5px 5px;
  border-top-color: transparent !important;
  border-right-color: transparent !important;
  border-bottom-color: transparent !important;
  right: -5px;
  top: calc(50% - 5px);
  margin-left: 0;
  margin-right: 0;
}

.tooltip.popover .popover-inner {
  background: #f9f9f9;
  color: black;
  padding: 24px;
  border-radius: 5px;
  box-shadow: 0 5px 30px rgba(black, 0.1);
}

.tooltip.popover .popover-arrow {
  border-color: #f9f9f9;
}

.tooltip[aria-hidden='true'] {
  visibility: hidden;
  opacity: 0;
  transition: opacity 0.15s, visibility 0.15s;
}

.tooltip[aria-hidden='false'] {
  visibility: visible;
  opacity: 1;
  transition: opacity 0.15s;
}
</style>

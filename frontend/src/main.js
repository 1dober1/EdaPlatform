import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import './assets/main.css'
import 'nprogress/nprogress.css'
import NProgress from 'nprogress'

NProgress.configure({ showSpinner: false })

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.directive('focus', {
  mounted(el) {
    el.focus()
  }
})

app.mount('#app')

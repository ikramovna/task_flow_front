<script setup lang="ts">
const emit = defineEmits<{ support: [] }>()
const faqSection = ref<HTMLElement | null>(null)
const { topics, searchInput, search, openFaq, filteredFaqs, runSearch, runTopicSearch } = useHelpStore()

const searchHelp = async (query = searchInput.value) => {
  runSearch(query)
  await nextTick()
  faqSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const searchTopic = async (topic: (typeof topics)[number]) => {
  runTopicSearch(topic)
  await nextTick()
  faqSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <section class="tf-help-page">
    <section class="tf-help-search-card">
      <div class="tf-help-search-intro"><span class="tf-help-search-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.3 2.3 0 1 1 3.7 1.8c-1 .7-1.5 1.1-1.5 2.2M12 17h.01"/></svg></span><div><h2>How can we help you today?</h2><p>Search our help center or explore topics below.</p></div></div>
      <div class="tf-help-search-area"><div class="tf-help-search-row"><label><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m21 21-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"/></svg><input v-model="searchInput" placeholder="Search help articles, features, or questions..." @keydown.enter="searchHelp()" /></label><button type="button" @click="searchHelp()">Search</button></div><div class="tf-help-popular"><span>Popular searches:</span><button type="button" @click="searchHelp('create task')">Create a task</button><button type="button" @click="searchHelp('team members')">Team members</button><button type="button" @click="searchHelp('notifications')">Notifications</button></div></div>
    </section>
    <div class="tf-help-layout">
      <div class="tf-help-main-column">
        <section class="tf-help-section"><h2>Browse help topics</h2><div class="tf-help-topic-grid"><button v-for="topic in topics" :key="topic.key" type="button" :class="['tf-help-topic', `is-${topic.tone}`]" @click="searchTopic(topic)"><span class="tf-help-topic-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path :d="topic.icon"/></svg></span><span class="tf-help-topic-copy"><b>{{ topic.title }}</b><small>{{ topic.description }}</small><em>{{ topic.articles }} article{{ topic.articles === 1 ? '' : 's' }} <span>›</span></em></span></button></div></section>
        <section ref="faqSection" class="tf-help-section tf-help-faq"><div class="tf-help-section-heading"><h2>Frequently asked questions</h2><button type="button" @click="searchHelp('')">View all articles</button></div><p v-if="search" class="tf-help-search-result">{{ filteredFaqs.length }} result{{ filteredFaqs.length === 1 ? '' : 's' }} for “{{ search }}”</p><div class="tf-help-faq-list"><article v-for="faq in filteredFaqs" :key="faq.question"><button type="button" @click="openFaq = openFaq === faq.index ? null : faq.index"><span>{{ faq.question }}</span><svg viewBox="0 0 20 20" :class="openFaq === faq.index ? 'rotate-180' : ''" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 7.5 5 5 5-5"/></svg></button><p v-if="openFaq === faq.index">{{ faq.answer }}</p></article><p v-if="!filteredFaqs.length" class="tf-help-empty">No matching questions found. Try “task”, “report”, or “team”.</p></div></section>
      </div>
      <aside class="tf-help-support"><div class="tf-help-support-heading"><h2>Contact support</h2><p>Choose the best way to get help.</p></div>
        <article class="tf-help-support-card is-chat"><span class="tf-help-support-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 12a8 8 0 0 1-8 8H6l-4 2 1.3-4A8 8 0 1 1 21 12Z"/></svg></span><div><h3>Live Chat <i><span/>Online</i></h3><p>Chat with our support team<br>in real time.</p></div><button type="button" @click="emit('support')">Start chat</button></article>
        <article class="tf-help-support-card"><span class="tf-help-support-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 5h18v14H3V5Zm1 1 8 7 8-7"/></svg></span><div><h3>Email Support</h3><p>Send us an email and we'll<br>get back to you.</p></div><a href="mailto:hello.confidency@gmail.com">Replies within 24 hours</a></article>
        <article class="tf-help-support-card"><span class="tf-help-support-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 3h4l2 5-2.5 1.5a15 15 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2C10.2 21 3 13.8 3 5a2 2 0 0 1 2-2Z"/></svg></span><div><h3>Phone Support</h3><p>Speak with our team<br>by phone.</p></div><a href="tel:+998916383191">Mon–Fri, 9 AM–6 PM</a></article>
      </aside>
    </div>
    <section class="tf-help-request"><span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.3 2.3 0 1 1 3.7 1.8c-1 .7-1.5 1.1-1.5 2.2M12 17h.01"/></svg></span><div><h2>Still need help?</h2><p>Our team is here to assist you with any questions or issues.</p></div><button type="button" @click="emit('support')">Submit a support request</button></section>
  </section>
</template>

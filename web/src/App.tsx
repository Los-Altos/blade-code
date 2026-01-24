import { Layout } from '@/components/layout/Layout'
import { ThemeProvider } from '@/components/ThemeProvider'
import { ChatView } from '@/components/chat/ChatView'

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="blade-ui-theme">
      <Layout>
        <ChatView />
      </Layout>
    </ThemeProvider>
  )
}

export default App

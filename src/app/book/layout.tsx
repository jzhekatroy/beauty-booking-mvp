import Script from 'next/script'

export default function BookLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Script 
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="beforeInteractive"
      />
      {children}
    </>
  )
}
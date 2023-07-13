import { ImageContainer, ProductContainer, ProductDetails } from "../../styles/pages/product"
import { GetStaticPaths, GetStaticProps } from "next"
import { stripe } from "../../lib/stripe"
import Stripe from "stripe"
import Image from "next/image"
import axios from "axios"
import { useState } from "react"
import Head from "next/head"

interface ProductProps {
  product: {
    id: string;
    name: string;
    imageUrl: string;
    price: string;
    description: string;
    defaultPriceId: string;
  }
}

export default function Product({ product }: ProductProps) {
  const [isCreatingCheckoutSession, setIsCreatingCheckoutSession] = useState(false)

  async function handleBuyProduct() {
    try {
      setIsCreatingCheckoutSession(true)

      const response = await axios.post('/api/checkout', {
        priceId: product.defaultPriceId
      })

      const { checkoutUrl } = response.data

      window.location.href = checkoutUrl // rota externa, para rota interna, utilizar o useRouter do next

    } catch (error) {
      setIsCreatingCheckoutSession(false)

      // Conectar com uma ferramenta de observisibilidade (datadog / sentry)
      alert('Falha ao redirecionar ao checkout!')
    }
  }

  return (
    <>
      <Head>
        <title>{product.name} | Ignite Shop</title>
      </Head>

      <ProductContainer>
        <ImageContainer>
          <Image src={product.imageUrl} width={520} height={480} alt="" />
        </ImageContainer>

        <ProductDetails>
          <h1>{product.name}</h1>
          <span>{product.price}</span>

          <p>{product.description}</p>

          <button disabled={isCreatingCheckoutSession} onClick={handleBuyProduct}>
            Comprar agora
          </button>
        </ProductDetails>
      </ProductContainer>
    </>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  // Recomendado a fazer o params id apenas para produtos mais vendidos / acessados
  // com fallback = false, o next vai tentar renderizar o html com os dados, mas os dados só serão carregados após a página montada
  // com fallback = true, dá para passar um loading da página (como skeleton, por exemplo), utilizando o isFallback do hook useRouter() do next
  // com fallback = 'blocking', nada será renderizado até os dados serem obtidos, mas não exibe nada em tela
  // ou seja, com fallback false, vai dar erro pois o product é undefined
  // com fallback true, dá para inserir um loading (o que é recomendado)

  return {
    paths: [
      { params: { id: 'prod_OFGjONIwFyySIR' } }
    ],
    fallback: 'blocking',
  }
}

export const getStaticProps: GetStaticProps<any, { id: string }> = async ({ params }) => {
  const productId = params.id

  const product = await stripe.products.retrieve(productId, {
    expand: ['default_price']
  })


  const price = product.default_price as Stripe.Price

  return {
    props: {
      product: {
        id: product.id,
        name: product.name,
        imageUrl: product.images[0],
        price: new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(price.unit_amount / 100),
        description: product.description,
        defaultPriceId: price.id,
      }
    },
    revalidate: 60 * 60 * 1,
  }
}

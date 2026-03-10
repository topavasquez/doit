import { Image, type ViewStyle } from 'react-native'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showWordmark?: boolean
  style?: ViewStyle
}

const HEIGHTS = { sm: 48, md: 60, lg: 80 }

export function Logo({ size = 'md', style }: LogoProps) {
  const h = HEIGHTS[size]
  return (
    <Image
      source={{ uri: 'https://res.cloudinary.com/dohtcfagz/image/upload/v1773112079/logo-black_esrgmn.png' }}
      style={[{ height: h, width: h * 3.2, resizeMode: 'contain' }, style]}
    />
  )
}

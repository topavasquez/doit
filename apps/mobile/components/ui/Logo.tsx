import { View, Text, StyleSheet, type ViewStyle } from 'react-native'
import { Colors } from '../../constants/colors'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showWordmark?: boolean
  style?: ViewStyle
}

const TEXT_SIZES = { sm: 20, md: 26, lg: 36 }

export function Logo({ size = 'md', style }: LogoProps) {
  return (
    <View style={[styles.row, style]}>
      <Text style={[styles.wordmark, { fontSize: TEXT_SIZES[size] }]}>
        <Text style={styles.accent}>Do</Text>It
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  wordmark: { color: Colors.text, fontWeight: '900', letterSpacing: -0.5 },
  accent: { color: Colors.primary },
})

import { View, StyleSheet, type ViewStyle } from 'react-native'
import { Colors } from '../../constants/colors'

interface CardProps {
  children: React.ReactNode
  style?: ViewStyle
  elevated?: boolean
  noPad?: boolean
}

export function Card({ children, style, elevated = false, noPad = false }: CardProps) {
  return (
    <View style={[styles.card, elevated && styles.elevated, noPad && styles.noPad, style]}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  elevated: {
    backgroundColor: Colors.surfaceElevated,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  noPad: { padding: 0 },
})

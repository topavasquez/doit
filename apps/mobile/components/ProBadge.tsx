import { View, Text, StyleSheet } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Colors } from '../constants/colors'

export function ProBadge({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const isMd = size === 'md'
  return (
    <View style={[styles.badge, isMd && styles.badgeMd]}>
      <MaterialCommunityIcons
        name="crown"
        size={isMd ? 13 : 10}
        color="#000"
      />
      <Text style={[styles.text, isMd && styles.textMd]}>Pro</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.primary,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeMd: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  text: {
    color: '#000',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  textMd: {
    fontSize: 12,
  },
})

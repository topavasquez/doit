import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, type ViewStyle } from 'react-native'
import { Colors } from '../../constants/colors'

interface ButtonProps {
  onPress: () => void
  title: string
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  style?: ViewStyle
  fullWidth?: boolean
}

export function Button({
  onPress,
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  fullWidth = false,
}: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        styles.base,
        styles[variant],
        styles[size],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#000' : Colors.primary} size="small" />
      ) : (
        <Text style={[styles.text, styles[`${variant}Text`], styles[`${size}Text`]]}>{title}</Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.4 },

  // Variants
  primary: { backgroundColor: Colors.primary },
  secondary: { backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.border },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: Colors.error },

  // Sizes
  sm: { paddingHorizontal: 12, paddingVertical: 8 },
  md: { paddingHorizontal: 20, paddingVertical: 14 },
  lg: { paddingHorizontal: 24, paddingVertical: 18 },

  // Text base
  text: { fontWeight: '700', letterSpacing: 0.3 },

  // Variant text
  primaryText: { color: '#000000' },
  secondaryText: { color: Colors.text },
  ghostText: { color: Colors.primary },
  dangerText: { color: '#fff9f9' },

  // Size text
  smText: { fontSize: 13 },
  mdText: { fontSize: 15 },
  lgText: { fontSize: 17 },
})

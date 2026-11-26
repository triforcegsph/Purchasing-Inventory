import 'package:flutter/material.dart';

/// Enterprise design tokens matching the Triforce / Infor SunSystems web UI.
class AppColors {
  AppColors._();

  // Core Chrome
  static const Color masthead = Color(0xFF23262B);
  static const Color mastheadBorder = Color(0xFF16181C);
  static const Color sidebar = Color(0xFF2B2F36);
  static const Color sidebarActive = Color(0xFF1F2328);
  static const Color sidebarDivider = Color(0xFF3A3F48);
  static const Color darkInput = Color(0xFF181A1E);

  // Brand Blues
  static const Color primaryBlue = Color(0xFF0072ED);
  static const Color primaryBlueDark = Color(0xFF005EC4);
  static const Color accentLightBlue = Color(0xFF4DA3FF);
  static const Color softBlueBg = Color(0xFFE7F1FF);
  static const Color paleBlueBg = Color(0xFFF4F8FF);
  static const Color deepBlueText = Color(0xFF004A99);

  // Surfaces & Borders
  static const Color canvas = Color(0xFFEEF0F3);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color headerSurface = Color(0xFFF4F6F8);
  static const Color subtleSurface = Color(0xFFFAFBFD);
  static const Color border = Color(0xFFCFD5DC);
  static const Color inputBorder = Color(0xFFB9C0C8);
  static const Color divider = Color(0xFFE5E8EC);

  // Typography
  static const Color textPrimary = Color(0xFF1F2328);
  static const Color textSecondary = Color(0xFF495057);
  static const Color textMuted = Color(0xFF5C646D);
  static const Color textHint = Color(0xFF6B7280);

  // Semantic Status Colors
  static const Color success = Color(0xFF137333);
  static const Color successBg = Color(0xFFE6F4EA);
  static const Color successBorder = Color(0xFFA8DAB5);

  static const Color warning = Color(0xFF8D6E00);
  static const Color warningBg = Color(0xFFFFF8E1);
  static const Color warningBorder = Color(0xFFFFE082);

  static const Color orange = Color(0xFFB06000);
  static const Color orangeBg = Color(0xFFFEF3E2);
  static const Color orangeBorder = Color(0xFFFDD69B);

  static const Color danger = Color(0xFFD5002B);
  static const Color dangerText = Color(0xFFC5221F);
  static const Color dangerBg = Color(0xFFFCE8E6);
  static const Color dangerBorder = Color(0xFFF6AEA9);

  static const Color draftBg = Color(0xFFF1F3F5);
  static const Color draftBorder = Color(0xFFCED4DA);
}

class AppTheme {
  static ThemeData get lightTheme {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: AppColors.primaryBlue,
      brightness: Brightness.light,
      primary: AppColors.primaryBlue,
      onPrimary: Colors.white,
      surface: AppColors.surface,
      onSurface: AppColors.textPrimary,
      error: AppColors.danger,
      onError: Colors.white,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: AppColors.canvas,
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.masthead,
        foregroundColor: Colors.white,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        titleTextStyle: TextStyle(
          fontSize: 15,
          fontWeight: FontWeight.w700,
          color: Colors.white,
          letterSpacing: 0.3,
        ),
        iconTheme: IconThemeData(color: Colors.white, size: 22),
      ),
      cardTheme: CardThemeData(
        color: AppColors.surface,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(4),
          side: const BorderSide(color: AppColors.border, width: 1),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surface,
        isDense: true,
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(4),
          borderSide: const BorderSide(color: AppColors.inputBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(4),
          borderSide: const BorderSide(color: AppColors.inputBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(4),
          borderSide: const BorderSide(color: AppColors.primaryBlue, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(4),
          borderSide: const BorderSide(color: AppColors.danger),
        ),
        labelStyle: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
        hintStyle: const TextStyle(fontSize: 13, color: AppColors.textHint),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primaryBlue,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
          textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.textPrimary,
          side: const BorderSide(color: AppColors.inputBorder),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
          textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: AppColors.surface,
        indicatorColor: AppColors.softBlueBg,
        elevation: 4,
        surfaceTintColor: Colors.transparent,
        height: 66,
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return TextStyle(
            fontSize: 11,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
            color: selected ? AppColors.primaryBlue : AppColors.textMuted,
          );
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return IconThemeData(
            size: 22,
            color: selected ? AppColors.primaryBlue : AppColors.textMuted,
          );
        }),
      ),
      dividerTheme: const DividerThemeData(
        color: AppColors.divider,
        thickness: 1,
        space: 1,
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
      ),
    );
  }
}

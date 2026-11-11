using System;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Interop;
using System.Windows.Media;
using System.Windows.Media.Effects;

namespace FreeCorrector
{
    // The suggestions for one mark. The card never takes the focus, so the
    // application keeps its caret and selection while the user clicks in it.
    sealed class Card : Window
    {
        public Mark? Mark { get; private set; }
        public IntPtr Handle { get; private set; }
        public Action<Match, string>? Replace;
        public Action<Match>? Ignore, AddWord, DisableRule, Conjugate;

        public Card()
        {
            WindowStyle = WindowStyle.None;
            AllowsTransparency = true;
            Background = Brushes.Transparent;
            ResizeMode = ResizeMode.NoResize;
            SizeToContent = SizeToContent.WidthAndHeight;
            Topmost = true;
            ShowInTaskbar = false;
            ShowActivated = false;
            FontFamily = new FontFamily("Segoe UI");
            FontSize = 13;
            SourceInitialized += (_, _) =>
            {
                Handle = new WindowInteropHelper(this).Handle;
                Native.AddExStyle(Handle, Native.WS_EX_NOACTIVATE | Native.WS_EX_TOOLWINDOW);
            };
        }

        public bool Shows(Mark mark) => IsVisible && Mark?.Match == mark.Match;

        public void ShowFor(Mark mark)
        {
            Mark = mark;
            var match = mark.Match;
            var panel = new StackPanel { MaxWidth = 360 };

            var head = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 0, 0, 6) };
            head.Children.Add(new System.Windows.Shapes.Ellipse { Width = 8, Height = 8, Fill = Theme.Category(match.Category), Margin = new Thickness(0, 0, 7, 0), VerticalAlignment = VerticalAlignment.Center });
            head.Children.Add(new TextBlock { Text = Label(match.Category), FontWeight = FontWeights.SemiBold, Foreground = Theme.Text });
            panel.Children.Add(head);
            panel.Children.Add(new TextBlock { Text = match.Message, TextWrapping = TextWrapping.Wrap, Foreground = Theme.Text });

            var choices = new WrapPanel { Margin = new Thickness(0, 10, 0, 2) };
            foreach (var replacement in match.Replacements.Take(5))
                choices.Children.Add(Pill(replacement.Length == 0 ? L.T("(supprimer)", "(delete)") : replacement, true, () => Replace?.Invoke(match, replacement)));
            panel.Children.Add(choices);

            // A conjugation mistake: that verb in the conjugator window.
            if (match.Verb.Length > 0)
            {
                var conjugate = new TextBlock
                {
                    Text = L.T($"Voir la conjugaison de « {match.Verb} »", $"See how to conjugate « {match.Verb} »"),
                    Foreground = Theme.Accent,
                    FontWeight = FontWeights.SemiBold,
                    Margin = new Thickness(0, 2, 0, 8),
                    Cursor = Cursors.Hand,
                };
                conjugate.MouseEnter += (_, _) => conjugate.TextDecorations = TextDecorations.Underline;
                conjugate.MouseLeave += (_, _) => conjugate.TextDecorations = null;
                conjugate.MouseLeftButtonUp += (_, _) => { Hide(); Conjugate?.Invoke(match); };
                panel.Children.Add(conjugate);
            }

            var actions = new WrapPanel { Margin = new Thickness(0, 2, 0, 0) };
            actions.Children.Add(Pill(L.T("Ignorer", "Ignore"), false, () => Ignore?.Invoke(match)));
            if (match.Category == "spelling")
                actions.Children.Add(Pill(L.T("Ajouter au dictionnaire", "Add to dictionary"), false, () => AddWord?.Invoke(match)));
            else
                actions.Children.Add(Pill(L.T("Désactiver cette règle", "Turn off this rule"), false, () => DisableRule?.Invoke(match)));
            panel.Children.Add(actions);
            panel.Children.Add(new TextBlock { Text = "FreeCorrector", FontSize = 11, Foreground = Theme.Muted, Margin = new Thickness(0, 6, 0, 0) });

            Content = new Border
            {
                Child = panel,
                Padding = new Thickness(14, 12, 14, 10),
                Margin = new Thickness(10),
                CornerRadius = new CornerRadius(8),
                Background = Theme.Background,
                BorderBrush = Theme.Border,
                BorderThickness = new Thickness(1),
                Effect = new DropShadowEffect { BlurRadius = 14, ShadowDepth = 2, Opacity = 0.25 },
            };

            if (!IsVisible) { Left = -32000; Top = -32000; Show(); }
            UpdateLayout();
            Place(mark.Boxes[0]);
        }

        // Under the word, or above it when the screen ends below.
        void Place(Rect word)
        {
            Native.GetWindowRect(Handle, out var r);
            int width = r.Right - r.Left, height = r.Bottom - r.Top;
            var area = System.Windows.Forms.Screen.FromPoint(new System.Drawing.Point((int)word.Left, (int)word.Bottom)).WorkingArea;
            // The card has a 10-unit margin for its shadow: line its border up with the word.
            var margin = (int)Math.Round(10 * VisualTreeHelper.GetDpi(this).DpiScaleX);
            var x = (int)word.Left - margin;
            var y = (int)word.Bottom + 4 - margin;
            if (y + height > area.Bottom) y = (int)word.Top - height + margin - 4;
            x = Math.Max(area.Left, Math.Min(x, area.Right - width));
            Native.MoveTo(Handle, x, y);
        }

        static string Label(string category) => category switch
        {
            "spelling" => L.T("Orthographe", "Spelling"),
            "grammar" => L.T("Grammaire", "Grammar"),
            _ => L.T("Style et typographie", "Style and typography"),
        };

        Border Pill(string text, bool primary, Action click)
        {
            var normal = primary ? Theme.Accent : Brushes.Transparent;
            var pill = new Border
            {
                Child = new TextBlock { Text = text, Foreground = primary ? Brushes.White : Theme.Text },
                Background = normal,
                BorderBrush = primary ? Theme.Accent : Theme.Border,
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(5),
                Padding = new Thickness(10, 3, 10, 4),
                Margin = new Thickness(0, 0, 6, 6),
                Cursor = Cursors.Hand,
            };
            var hover = new SolidColorBrush(primary ? Color.FromRgb(0x1d, 0x4e, 0xd8) : Color.FromArgb(0x22, 0x80, 0x80, 0x80));
            pill.MouseEnter += (_, _) => pill.Background = hover;
            pill.MouseLeave += (_, _) => pill.Background = normal;
            pill.MouseLeftButtonUp += (_, _) => { Hide(); click(); };
            return pill;
        }
    }
}

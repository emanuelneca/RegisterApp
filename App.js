import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Switch, Alert, FlatList } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

// --- Definições de Cores e Temas ---
const CATEGORY_COLORS = {
  'Alimentação': '#3B82F6', // Azul
  'Transporte': '#60A5FA',  // Azul Claro
  'Lazer': '#93C5FD',       // Azul Mapeado
  'Moradia': '#10B981',     // Verde
  'Outros': '#F87171',      // Vermelho/Ciano
  'Vazio': '#E5E7EB',       // Cinza para área sem gastos
};

const lightTheme = {
  background: '#F9FAFB',
  screenBackground: 'white',
  cardBackground: 'white',
  text: '#1F2937',
  secondaryText: '#4B5563',
  inputBackground: '#FFF',
  inputBorder: '#D1D5DB',
  primary: '#3B82F6',
  delete: '#DC2626', // Vermelho para deletar
  secondaryButtonText: '#3B82F6',
  headerBorder: '#F0F0F0',
};

const darkTheme = {
  background: '#121212',
  screenBackground: '#1F2937',
  cardBackground: '#374151',
  text: '#F9FAFB',
  secondaryText: '#D1D5DB',
  inputBackground: '#4B5563',
  inputBorder: '#6B7280',
  primary: '#60A5FA',
  delete: '#EF4444', // Vermelho mais claro
  secondaryButtonText: '#60A5FA',
  headerBorder: '#2D3748',
};

// --- Lógica de Cálculo Dinâmico ---
const calculateExpenseSummary = (expenseList) => {
  const allCategories = Object.keys(CATEGORY_COLORS).filter(c => c !== 'Vazio');
  let totalSpent = 0;
  let categoryTotals = {};

  allCategories.forEach(cat => categoryTotals[cat] = 0);

  expenseList.forEach(expense => {
    const value = parseFloat(expense.value || 0); 
    if (isNaN(value)) return; 

    totalSpent += value;
    
    const category = allCategories.includes(expense.category) ? expense.category : 'Outros';
    categoryTotals[category] += value;
  });

  let summary = [];
  allCategories.forEach(name => {
    const value = categoryTotals[name];
    
    // Inclui todas as categorias que tiveram algum gasto, mais 'Vazio' se o total for 0.
    if (value > 0 || totalSpent === 0) {
      const percentage = totalSpent > 0 ? (value / totalSpent) * 100 : 0;
      summary.push({
        name,
        percentage: Math.round(percentage),
        value,
        color: CATEGORY_COLORS[name],
      });
    }
  });

  if (totalSpent === 0) {
      summary.push({
          name: 'Vazio',
          percentage: 100,
          value: 0,
          color: CATEGORY_COLORS['Vazio'],
      });
  }

  summary.sort((a, b) => b.percentage - a.percentage);

  // Remove a categoria 'Vazio' se houver outros gastos
  if (totalSpent > 0) {
      summary = summary.filter(item => item.name !== 'Vazio');
  }

  return {
    totalSpent,
    categories: summary,
  };
};

// --- Componentes Compartilhados ---

const Header = ({ title, onBack, theme }) => (
  <View style={[styles.header, { backgroundColor: theme.cardBackground, borderBottomColor: theme.headerBorder }]}>
    {onBack && (
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={[styles.backText, { color: theme.secondaryText }]}>&larr;</Text>
      </TouchableOpacity>
    )}
    <Text style={[styles.headerTitle, { color: theme.text }]}>{title}</Text>
  </View>
);

const ThemedCard = ({ children, theme, style }) => (
    <View style={[styles.card, styles.shadow, { backgroundColor: theme.cardBackground }, style]}>
        {children}
    </View>
);

// --- Componente de Item de Gasto (Para listagem e exclusão) ---
const ExpenseListItem = ({ expense, theme, onDelete }) => {
    const categoryColor = CATEGORY_COLORS[expense.category] || theme.secondaryText;

    const handleDelete = () => {
        Alert.alert(
            "Confirmar Exclusão",
            `Tem certeza que deseja remover o gasto "${expense.name}" (R$ ${expense.value.toFixed(2).replace('.', ',')})?`,
            [
                { text: "Cancelar", style: "cancel" },
                { text: "Excluir", onPress: () => onDelete(expense.id), style: "destructive" },
            ]
        );
    };

    return (
        <View style={[styles.expenseItem, { borderBottomColor: theme.headerBorder }]}>
            <View style={[styles.legendDot, { backgroundColor: categoryColor }]} />
            <View style={styles.expenseDetails}>
                <Text style={[styles.expenseName, { color: theme.text }]}>{expense.name}</Text>
                <Text style={[styles.expenseCategory, { color: theme.secondaryText }]}>
                    {expense.category} | {expense.date}
                </Text>
            </View>
            <View style={styles.expenseActions}>
                <Text style={[styles.expenseValue, { color: theme.text }]}>R$ {expense.value.toFixed(2).replace('.', ',')}</Text>
                <TouchableOpacity onPress={handleDelete} style={[styles.deleteButton, {backgroundColor: theme.delete}]}>
                    <Text style={styles.deleteButtonText}>X</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

// --- Componente Barra de Progresso de Orçamento ---
const BudgetProgressBar = ({ totalSpent, budget, theme }) => {
    const progress = budget > 0 ? Math.min(totalSpent / budget, 1) : 0;
    const progressWidth = `${progress * 100}%`;
    const isExceeded = totalSpent > budget;
    const barColor = isExceeded ? theme.delete : theme.primary;

    return (
        <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarBackground, { backgroundColor: theme.inputBorder }]}>
                <View style={[styles.progressBarFill, { width: progressWidth, backgroundColor: barColor }]} />
            </View>
            <Text style={[styles.progressBarLabel, { color: theme.secondaryText, marginTop: 5 }]}>
                {isExceeded 
                    ? `Orçamento excedido em ${((progress - 1) * 100).toFixed(0)}%`
                    : `${(progress * 100).toFixed(0)}% utilizado`}
            </Text>
        </View>
    );
};


// --- 1. Tela de Boas-vindas ---
const WelcomeScreen = ({ onNavigate, theme }) => (
  <View style={[styles.screenContainer, styles.centeredContainer, { backgroundColor: theme.screenBackground }]}> 
    <ThemedCard theme={theme} style={{ width: '92%', maxWidth: 420, alignItems: 'center' }}>
      <Ionicons name="wallet-outline" size={56} color={theme.primary} style={styles.welcomeIcon} />
      <Text style={[styles.welcomeTitle, { color: theme.primary }]}>Registro de Gastos da Semana</Text>
      <Text style={[styles.welcomeText, { color: theme.secondaryText, textAlign: 'center', marginTop: 6 }]}> 
        Controle seus gastos e organize sua semana!
      </Text>
      <TouchableOpacity
        accessibilityRole="button"
        style={[styles.primaryButton, { backgroundColor: theme.primary, alignSelf: 'stretch' }]}
        onPress={() => onNavigate('login')}
      >
        <Text style={styles.buttonText}>Começar</Text>
      </TouchableOpacity>
    </ThemedCard>
  </View>
);

// --- 2. Tela de Login (agora com validação e UX aprimorada) ---
const LoginScreen = ({ onNavigate, theme, onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isValidEmail = /.+@.+\..+/.test(email.trim());
  const isValidPassword = password.length >= 6;
  const isValid = isValidEmail && isValidPassword && !submitting;

  const handleSubmit = () => {
    if (!isValidEmail || !isValidPassword) {
      Alert.alert('Atenção', 'Informe um email válido e senha com 6+ caracteres.');
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      onLogin?.(email.trim(), password);
      setSubmitting(false);
    }, 500);
  };

  return (
    <View style={[styles.screenContainer, { backgroundColor: theme.screenBackground }]}> 
      <Header title="Login" onBack={() => onNavigate('welcome')} theme={theme} />
      <ThemedCard theme={theme}>
        <Text style={[styles.label, { color: theme.secondaryText }]}>Email</Text>
        <TextInput 
          style={[styles.input, { borderColor: theme.inputBorder, color: theme.text, backgroundColor: theme.inputBackground }]} 
          placeholder="seu.email@exemplo.com" 
          keyboardType="email-address" 
          placeholderTextColor={theme.secondaryText}
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        {!isValidEmail && email.length > 0 && (
          <Text style={[styles.errorText, { color: theme.delete }]}>Email inválido</Text>
        )}
        
        <Text style={[styles.label, { color: theme.secondaryText }]}>Senha</Text>
        <View style={styles.passwordRow}>
          <TextInput 
            style={[styles.input, { flex: 1, borderColor: theme.inputBorder, color: theme.text, backgroundColor: theme.inputBackground }]} 
            placeholder="********" 
            secureTextEntry={!showPassword}
            placeholderTextColor={theme.secondaryText}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(p => !p)} style={styles.togglePassword}>
            <Text style={{ color: theme.secondaryText }}>{showPassword ? 'Ocultar' : 'Mostrar'}</Text>
          </TouchableOpacity>
        </View>
        {!isValidPassword && password.length > 0 && (
          <Text style={[styles.errorText, { color: theme.delete }]}>Mínimo de 6 caracteres</Text>
        )}

        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.primaryButton, { backgroundColor: theme.primary, opacity: isValid ? 1 : 0.6 }]}
          onPress={handleSubmit}
          disabled={!isValid}
        >
          <Text style={styles.buttonText}>{submitting ? 'Entrando...' : 'Entrar'}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => Alert.alert('Simulação', 'Navegando para tela de Cadastro...')}
        >
          <Text style={[styles.secondaryButtonText, { color: theme.secondaryButtonText }]}>Cadastrar-se</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryButton, { marginTop: 8 }]}
          onPress={() => Alert.alert('Ajuda', 'Link de recuperação enviado para seu email (simulação).')}
        >
          <Text style={[styles.secondaryButtonText, { color: theme.secondaryButtonText }]}>Esqueci minha senha</Text>
        </TouchableOpacity>
      </ThemedCard>
    </View>
  );
};

// --- Componente: Gráfico de Pizza Dinâmico (Simulação) ---
const DynamicPieChart = ({ categories, totalSpent, theme }) => {
    if (totalSpent === 0) {
        return (
            <View style={styles.pieChartContainer}>
                <View style={[styles.pieChart, { backgroundColor: CATEGORY_COLORS.Vazio }]}>
                    <View style={[styles.pieInnerCircle, { backgroundColor: theme.screenBackground }]}>
                        <Text style={[styles.chartTotalText, { color: theme.secondaryText }]}>R$ 0,00</Text>
                    </View>
                </View>
            </View>
        );
    }

    // SIMULAÇÃO DO GRÁFICO: Usa a cor da maior fatia (primeira categoria) para o círculo principal.
    // Isso é feito para garantir que o código seja executável em React Native sem bibliotecas de SVG/Gráficos.
    const largestSlice = categories[0];
    const displayTotal = totalSpent.toFixed(2).replace('.', ',');

    return (
        <View style={styles.pieChartContainer}>
            <View style={[styles.pieChart, { backgroundColor: largestSlice.color }]}>
                {/* O círculo interno simula o "furo" do donut ou a área central */}
                <View style={[styles.pieInnerCircle, { backgroundColor: theme.screenBackground }]}>
                    <Text style={[styles.chartTotalText, { color: theme.text }]}>R$ {displayTotal}</Text>
                    <Text style={[styles.chartSubText, { color: theme.secondaryText }]}>Total Gasto</Text>
                </View>
            </View>
        </View>
    );
};


// --- 3. Tela de Dashboard (Interativa com Gráfico Dinâmico) ---
const DashboardScreen = ({ onNavigate, theme, summary, budget }) => {
  const { totalSpent, categories } = summary;

  const formattedTotal = totalSpent.toFixed(2).replace('.', ',');
  const budgetRemaining = budget - totalSpent;
  const isOverBudget = budgetRemaining < 0;

  return (
    <View style={[styles.screenContainer, { backgroundColor: theme.screenBackground }]}>
      <Header title="Dashboard" onBack={() => onNavigate('login')} theme={theme} />
      <ScrollView style={styles.contentScrollView}>
        <ThemedCard theme={theme} style={styles.cardSection}>
          <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>Orçamento Semanal (R$ {budget.toFixed(2).replace('.', ',')})</Text>
          
          <BudgetProgressBar totalSpent={totalSpent} budget={budget} theme={theme} />
          
          <Text style={[styles.totalAmount, { color: isOverBudget ? theme.delete : theme.primary, fontSize: 22, marginTop: 15 }]}>
              {isOverBudget ? 'Excedido em' : 'Restante'}: R$ {Math.abs(budgetRemaining).toFixed(2).replace('.', ',')}
          </Text>
          
          <Text style={[styles.sectionTitle, { color: theme.secondaryText, marginTop: 30 }]}>Gasto Total</Text>
          
          {/* Gráfico de Pizza Dinâmico (Visualização Central) */}
          <DynamicPieChart categories={categories} totalSpent={totalSpent} theme={theme} />

          {totalSpent > 0 ? (
            <View style={styles.legendContainer}>
                <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 10 }]}>Distribuição por Categoria:</Text>
                {/* Legenda Detalhada (Mostra todas as "fatias") */}
                {categories.filter(c => c.name !== 'Vazio').map((item, index) => (
                  <View key={item.name} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                    <Text style={[styles.legendText, { color: theme.text }]}>{item.name}</Text>
                    <Text style={[styles.legendPercentage, { color: theme.primary }]}>{item.percentage}%</Text>
                  </View>
                ))}
            </View>
          ) : (
             <Text style={[styles.sectionTitle, {color: theme.secondaryText, marginTop: 10, textAlign: 'center'}]}>
              Adicione gastos para ver a distribuição!
            </Text>
          )}

          <TouchableOpacity
            style={[styles.primaryButton, { marginTop: 20, backgroundColor: theme.primary }]}
            onPress={() => onNavigate('history')}
          >
            <Text style={styles.buttonText}>Adicionar gasto</Text>
          </TouchableOpacity>
        </ThemedCard>

        {/* Botões de navegação rápida para protótipo */}
        <View style={styles.quickNav}>
            <TouchableOpacity onPress={() => onNavigate('expenseList')} style={[styles.quickNavButton, { backgroundColor: theme.cardBackground, borderColor: theme.headerBorder }]}>
                <Text style={[styles.quickNavText, { color: theme.secondaryText }]}>Histórico Completo</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onNavigate('stats')} style={[styles.quickNavButton, { backgroundColor: theme.cardBackground, borderColor: theme.headerBorder }]}>
                <Text style={[styles.quickNavText, { color: theme.secondaryText }]}>Ver Estatísticas</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onNavigate('settings')} style={[styles.quickNavButton, { backgroundColor: theme.cardBackground, borderColor: theme.headerBorder }]}>
                <Text style={[styles.quickNavText, { color: theme.secondaryText }]}>Configurações</Text>
            </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
};

// --- 4. Tela de Adicionar Gasto (Histórico) - Lista de Categoria ---
const HistoryScreen = ({ onNavigate, theme, addExpense }) => {
  const [expenseName, setExpenseName] = useState('');
  const [value, setValue] = useState('');
  const [category, setCategory] = useState(Object.keys(CATEGORY_COLORS).filter(c => c !== 'Vazio')[0]);
  const [date, setDate] = useState(new Date().toLocaleDateString('pt-BR')); 

  const categories = Object.keys(CATEGORY_COLORS).filter(c => c !== 'Vazio');

  const handleSave = () => {
    const rawValue = value.replace('.', '').replace(',', '.'); 
    const valueNum = parseFloat(rawValue);

    if (!expenseName || isNaN(valueNum) || valueNum <= 0) {
        Alert.alert('Erro', 'Por favor, preencha o nome do gasto e um valor numérico válido.');
        return;
    }

    addExpense({ 
        name: expenseName, 
        value: valueNum, 
        category, 
        date 
    });
    
    Alert.alert('Sucesso!', `${expenseName} de R$${valueNum.toFixed(2).replace('.', ',')} salvo.`);
    onNavigate('dashboard');
  };
  
  // Componente de Seleção de Categoria (Lista Vertical)
  const CategorySelectorList = () => (
    <View style={[styles.categoryListContainer, { borderColor: theme.inputBorder, backgroundColor: theme.inputBackground }]}>
        {categories.map((cat, index) => (
            <TouchableOpacity
                key={cat}
                onPress={() => setCategory(cat)}
                style={[
                    styles.categoryListItem,
                    { 
                        backgroundColor: category === cat ? CATEGORY_COLORS[cat] + '15' : 'transparent', // Fundo suave
                        borderColor: category === cat ? CATEGORY_COLORS[cat] : 'transparent',
                        borderBottomColor: index === categories.length - 1 ? 'transparent' : theme.inputBorder, // Separador
                        borderBottomWidth: index === categories.length - 1 ? 0 : 1, 
                    }
                ]}
            >
                <View style={[styles.legendDot, { backgroundColor: CATEGORY_COLORS[cat] }]} />
                <Text style={[styles.categoryButtonTextList, { color: theme.text }]}>
                    {cat}
                </Text>
                {category === cat && <Text style={[styles.checkMark, { color: CATEGORY_COLORS[cat] }]}>✓</Text>}
            </TouchableOpacity>
        ))}
    </View>
  );


  return (
    <View style={[styles.screenContainer, { backgroundColor: theme.screenBackground }]}>
      <Header title="Histórico" onBack={() => onNavigate('dashboard')} theme={theme} />
      <ScrollView style={styles.contentScrollView}>
        <ThemedCard theme={theme}>
          
          <Text style={[styles.label, { color: theme.secondaryText }]}>Nome do gasto</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.inputBorder, color: theme.text, backgroundColor: theme.inputBackground }]} 
            placeholder="Ex: Almoço com amigos"
            value={expenseName}
            onChangeText={setExpenseName}
            placeholderTextColor={theme.secondaryText}
          />
          
          <Text style={[styles.label, { color: theme.secondaryText }]}>Valor (R$)</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.inputBorder, color: theme.text, backgroundColor: theme.inputBackground }]} 
            placeholder="50,00"
            keyboardType="numeric"
            value={value}
            onChangeText={(text) => setValue(text.replace(/[^0-9,]/g, ''))}
            placeholderTextColor={theme.secondaryText}
          />
          
          <Text style={[styles.label, { color: theme.secondaryText }]}>Categoria</Text>
          <CategorySelectorList />

          <Text style={[styles.label, { color: theme.secondaryText }]}>Data</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.inputBorder, color: theme.text, backgroundColor: theme.inputBackground }]} 
            placeholder="dd/mm/aaaa"
            value={date}
            onChangeText={setDate}
            placeholderTextColor={theme.secondaryText}
          />

          <TouchableOpacity
            style={[styles.primaryButton, { marginTop: 20, backgroundColor: theme.primary }]}
            onPress={handleSave}
          >
            <Text style={styles.buttonText}>Salvar Gasto</Text>
          </TouchableOpacity>
        </ThemedCard>
      </ScrollView>
    </View>
  );
};

// --- Novo Componente: Barra de Progresso de Categoria (para Estatísticas) ---
const CategoryProgressBar = ({ item, totalSpent, theme, budget }) => {
    const percentOfTotalSpent = item.percentage;
    const barWidth = totalSpent > 0 ? `${percentOfTotalSpent}%` : '0%';
    
    // Novo cálculo: Porcentagem que o gasto desta categoria representa do ORÇAMENTO TOTAL.
    const percentOfBudget = budget > 0 ? ((item.value / budget) * 100) : 0;

    return (
        <View style={styles.statsCategoryItem}>
            <View style={styles.statsCategoryHeader}>
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <Text style={[styles.statsCategoryText, { color: theme.text }]}>{item.name}</Text>
                <Text style={[styles.statsCategoryValue, { color: theme.secondaryText }]}>R$ {item.value.toFixed(2).replace('.', ',')}</Text>
                <Text style={[styles.statsCategoryPercentage, { color: item.color }]}>{percentOfTotalSpent}%</Text>
            </View>
            <View style={[styles.statsProgressBarBackground, { backgroundColor: theme.inputBorder, marginBottom: 8 }]}>
                <View style={[styles.statsProgressBarFill, { width: barWidth, backgroundColor: item.color }]} />
            </View>

            {/* Novo Indicador de Impacto no Orçamento */}
            <View style={styles.budgetImpactContainer}>
                <Text style={[styles.budgetImpactLabel, { color: theme.secondaryText }]}>Impacto no Orçamento (R$ {budget.toFixed(2).replace('.', ',')}):</Text>
                <Text style={[styles.budgetImpactValue, { color: theme.text }]}>{percentOfBudget.toFixed(1)}%</Text>
            </View>
            <View style={[styles.budgetImpactBarBackground, { backgroundColor: theme.inputBorder }]}>
                <View style={[styles.budgetImpactBarFill, { width: `${Math.min(percentOfBudget, 100)}%`, backgroundColor: item.color }]} />
            </View>

        </View>
    );
};


// --- 5. Tela de Estatísticas (Dinâmica e Interativa) ---
const StatsScreen = ({ onNavigate, theme, summary, budget }) => {
    const { categories, totalSpent } = summary;
    const budgetRemaining = budget - totalSpent;
    const topCategory = categories.length > 0 ? categories.find(c => c.name !== 'Vazio') : null;


    return (
      <View style={[styles.screenContainer, { backgroundColor: theme.screenBackground }]}>
        <Header title="Estatísticas" onBack={() => onNavigate('dashboard')} theme={theme} />
        <ScrollView style={styles.contentScrollView}>
          <ThemedCard theme={theme} style={styles.cardSection}>
            <Text style={[styles.sectionTitle, { color: theme.secondaryText, marginBottom: 5 }]}>Situação do Orçamento (R$ {budget.toFixed(2).replace('.', ',')})</Text>
            <Text style={[styles.totalAmount, { color: budgetRemaining < 0 ? theme.delete : theme.primary, fontSize: 22 }]}>
                {budgetRemaining < 0 ? 'R$' + Math.abs(budgetRemaining).toFixed(2).replace('.', ',') + ' (Excedido)' : 'R$' + budgetRemaining.toFixed(2).replace('.', ',') + ' (Restante)'}
            </Text>
            <BudgetProgressBar totalSpent={totalSpent} budget={budget} theme={theme} />


            {totalSpent > 0 ? (
              <View style={{ marginTop: 30 }}>
                <Text style={[styles.sectionTitle, {color: theme.text, marginBottom: 15}]}>
                  Distribuição de Gastos (Total: R$ {totalSpent.toFixed(2).replace('.', ',')})
                </Text>

                {topCategory && (
                    <ThemedCard theme={theme} style={{padding: 15, marginBottom: 20}}>
                        <Text style={[styles.sectionTitle, {color: topCategory.color, textAlign: 'center'}]}>
                            Categoria Principal: {topCategory.name} ({topCategory.percentage}%)
                        </Text>
                        <Text style={[styles.sectionTitle, {color: theme.secondaryText, textAlign: 'center', fontSize: 14, fontWeight: 'normal'}]}>
                            Representa {((topCategory.value / budget) * 100).toFixed(1)}% do seu orçamento total.
                        </Text>
                    </ThemedCard>
                )}
                
                {/* Visualização de barras interativas por categoria */}
                {categories.filter(c => c.name !== 'Vazio').map((item) => (
                    <CategoryProgressBar key={item.name} item={item} totalSpent={totalSpent} theme={theme} budget={budget} />
                ))}

              </View>
            ) : (
                <Text style={[styles.sectionTitle, {color: theme.secondaryText, marginTop: 40, textAlign: 'center'}]}>
                    Adicione gastos para ver as estatísticas completas!
                </Text>
            )}

            <TouchableOpacity
              style={[styles.primaryButton, { marginTop: 30, backgroundColor: theme.primary }]}
              onPress={() => Alert.alert('Simulação', 'Exportando relatório PDF/CSV...')}
            >
              <Text style={styles.buttonText}>Exportar relatório</Text>
            </TouchableOpacity>

          </ThemedCard>
        </ScrollView>
      </View>
    );
};

// --- 6. Tela de Configurações ---
const SettingsScreen = ({ onNavigate, theme, isDarkMode, toggleTheme, budget, setBudget, onLogout }) => {
    const [budgetInput, setBudgetInput] = useState(budget.toFixed(2).replace('.', ','));

    // Atualiza o input se o orçamento for alterado
    React.useEffect(() => {
        setBudgetInput(budget.toFixed(2).replace('.', ','));
    }, [budget]);

    const handleSaveBudget = () => {
        const rawValue = budgetInput.replace('.', '').replace(',', '.'); 
        const valueNum = parseFloat(rawValue);

        if (isNaN(valueNum) || valueNum <= 0) {
            Alert.alert('Erro', 'Por favor, insira um valor numérico válido para o orçamento.');
            return;
        }
        setBudget(valueNum); // Chama a função que salva no estado local
        Alert.alert('Sucesso', `Orçamento semanal salvo como R$${valueNum.toFixed(2).replace('.', ',')}.`);
    };

  const SettingItem = ({ label, onPress, children }) => (
    <TouchableOpacity
      style={[styles.settingItem, { borderBottomColor: theme.headerBorder }]}
      onPress={onPress}
      disabled={!onPress && !children}
    >
      <Text style={[styles.settingLabel, { color: theme.text }]}>{label}</Text>
      {children}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.screenContainer, { backgroundColor: theme.screenBackground }]}>
      <Header title="Configurações" onBack={() => onNavigate('dashboard')} theme={theme} />
      <ScrollView style={styles.contentScrollView}>
      <ThemedCard theme={theme} style={styles.cardSection}>
        
        <SettingItem 
            label="Alterar senha" 
            onPress={() => Alert.alert('Simulação', 'Navegando para tela de Alteração de Senha...')} 
        />
        
        <Text style={[styles.label, { color: theme.secondaryText, marginTop: 15 }]}>Orçamento semanal (R$)</Text>
        <View style={styles.budgetInputContainer}>
            <TextInput
                style={[styles.input, styles.budgetInput, { 
                    borderColor: theme.inputBorder, 
                    color: theme.text, 
                    backgroundColor: theme.inputBackground 
                }]} 
                placeholder="Ex: 1500,00"
                keyboardType="numeric"
                value={budgetInput}
                onChangeText={(text) => setBudgetInput(text.replace(/[^0-9,]/g, ''))}
                placeholderTextColor={theme.secondaryText}
            />
             <TouchableOpacity
                style={[styles.budgetSaveButton, { backgroundColor: theme.primary }]}
                onPress={handleSaveBudget}
            >
                <Text style={styles.buttonText}>Salvar</Text>
            </TouchableOpacity>
        </View>


        {/* O switch controla o tema de forma funcional */}
        <SettingItem label="Tema escuro"> 
          <Switch
            trackColor={{ false: theme.secondaryText, true: theme.primary }}
            thumbColor={theme.cardBackground}
            onValueChange={toggleTheme}
            value={isDarkMode}
          />
        </SettingItem>

        <SettingItem 
            label="Sobre" 
            onPress={() => Alert.alert('Simulação', 'Informações sobre a aplicação e a equipe.')} 
        />
        <SettingItem 
            label="Feedback" 
            onPress={() => Alert.alert('Simulação', 'Abrindo formulário de Feedback.')} 
        />

        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: theme.delete, marginTop: 10 }]}
          onPress={onLogout}
        >
          <Text style={styles.buttonText}>Sair da conta</Text>
        </TouchableOpacity>

      </ThemedCard>
      </ScrollView>
    </View>
  );
};

// --- 7. Tela de Listagem de Gastos e Exclusão ---
const ExpenseListScreen = ({ onNavigate, theme, expenses, onDelete }) => {
    const [refreshing, setRefreshing] = useState(false);
    const onRefresh = () => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 600);
    };
    return (
        <View style={[styles.screenContainer, { backgroundColor: theme.screenBackground }]}>
            <Header title="Histórico de Gastos" onBack={() => onNavigate('dashboard')} theme={theme} />
            
            <FlatList
                style={styles.listContainer}
                data={expenses.slice().reverse()} // Exibe os mais recentes primeiro
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <ThemedCard theme={theme} style={{padding: 0, marginVertical: 8}}>
                        <ExpenseListItem expense={item} theme={theme} onDelete={onDelete} />
                    </ThemedCard>
                )}
                refreshing={refreshing}
                onRefresh={onRefresh}
                ListEmptyComponent={() => (
                    <Text style={[styles.sectionTitle, {color: theme.secondaryText, marginTop: 40, textAlign: 'center'}]}>
                        Nenhum gasto registrado ainda.
                    </Text>
                )}
            />
        </View>
    );
};


// --- Componente Principal da Aplicação (Com Estado Local) ---
export default function App() {
  const [currentScreen, setCurrentScreen] = useState('welcome');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Dados reais: inicia com array vazio, os gastos são adicionados pelo usuário.
  const [budget, setBudget] = useState(3500.00); 
  const [expenses, setExpenses] = useState([]);


  // --- Funções CRUD Locais ---
  const addExpense = (newExpense) => {
    setExpenses(prev => [...prev, { ...newExpense, id: Date.now(), value: parseFloat(newExpense.value) }]);
  };
  
  const deleteExpense = (id) => {
      setExpenses(prev => prev.filter(expense => expense.id !== id));
      Alert.alert("Sucesso", "Gasto removido com sucesso.");
  };

  const toggleTheme = () => setIsDarkMode(prev => !prev);
  const handleLogin = (email, password) => {
    setIsAuthenticated(true);
    setCurrentScreen('dashboard');
  };
  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentScreen('welcome');
    Alert.alert('Sessão encerrada', 'Você saiu da sua conta.');
  };
  

  // --- Renderização ---
  const expenseSummary = calculateExpenseSummary(expenses);
  const theme = isDarkMode ? darkTheme : lightTheme;

  const AUTH_SCREENS = new Set(['dashboard', 'history', 'expenseList', 'stats', 'settings']);
  const navigate = (screenName) => {
    if (AUTH_SCREENS.has(screenName) && !isAuthenticated) {
      setCurrentScreen('login');
      return;
    }
    setCurrentScreen(screenName);
  };
  
  const renderScreen = () => {
    const screenProps = { 
        onNavigate: navigate, 
        theme, 
    };

    switch (currentScreen) {
      case 'welcome':
        return <WelcomeScreen {...screenProps} />;
      case 'login':
        return <LoginScreen {...screenProps} onLogin={handleLogin} />;
      case 'dashboard':
        return <DashboardScreen {...screenProps} summary={expenseSummary} budget={budget} />;
      case 'history': 
        return <HistoryScreen {...screenProps} addExpense={addExpense} />;
      case 'expenseList': 
        return <ExpenseListScreen {...screenProps} expenses={expenses} onDelete={deleteExpense} />;
      case 'stats':
        return <StatsScreen {...screenProps} summary={expenseSummary} budget={budget} />;
      case 'settings':
        return <SettingsScreen 
                    {...screenProps} 
                    isDarkMode={isDarkMode} 
                    toggleTheme={toggleTheme} 
                    budget={budget} 
                    setBudget={setBudget} // Usa a função local
                    onLogout={handleLogout}
                />;
      default:
        return <WelcomeScreen {...screenProps} />;
    }
  };


  return (
    <View style={[styles.appContainer, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      {renderScreen()}
    </View>
  );
}

// --- Estilos do React Native (StyleSheet) ---
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  loadingText: {
    fontSize: 18,
  },
  appContainer: {
    flex: 1,
    paddingTop: 40,
  },
  screenContainer: {
    flex: 1,
  },
  centeredContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  contentScrollView: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20, 
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 12,
    padding: 20,
    marginVertical: 10,
  },
  cardSection: {
    padding: 0,
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  // --- Header/Navegação ---
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  backButton: {
    paddingRight: 15,
  },
  backText: {
    fontSize: 24,
  },

  // --- Input/Formulário ---
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 15,
    marginBottom: 5,
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 16,
  },

  // --- Botões ---
  primaryButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 25,
  },
  secondaryButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // --- Dashboard/Estatísticas ---
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  
  // --- Barra de Progresso Geral (Dashboard) ---
  progressBarContainer: {
    marginTop: 10,
  },
  progressBarBackground: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressBarLabel: {
    fontSize: 12,
    textAlign: 'right',
  },

  // --- Gráfico de Pizza (Simulado) ---
  pieChartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  welcomeIcon: {
    marginBottom: 10,
  },
  pieChart: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    position: 'relative', // Necessário para posicionamento do inner circle
    overflow: 'hidden', // Importante para simulação
  },
  pieSlicePlaceholder: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    borderRadius: 75, // Simula a forma
  },
  pieInnerCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10, // Garante que o furo fique por cima
  },
  chartTotalText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  chartSubText: {
      fontSize: 12,
      fontWeight: 'normal',
  },
  
  // --- Legenda Geral ---
  legendContainer: {
    flexDirection: 'column',
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  legendText: {
    fontSize: 14,
    flex: 1,
  },
  legendPercentage: {
    fontSize: 14,
    fontWeight: '600',
  },

  // --- Estatísticas - Barras de Categoria ---
  statsCategoryItem: {
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0', // Cor fixa para divisor
  },
  statsCategoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  statsCategoryText: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
    marginLeft: 5,
  },
  statsCategoryValue: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 10,
  },
  statsCategoryPercentage: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  statsProgressBarBackground: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  statsProgressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  
  // --- Novo Indicador de Impacto no Orçamento (Estatísticas) ---
  budgetImpactContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 10,
  },
  budgetImpactLabel: {
      fontSize: 12,
  },
  budgetImpactValue: {
      fontSize: 14,
      fontWeight: 'bold',
  },
  budgetImpactBarBackground: {
      height: 6,
      borderRadius: 3,
      overflow: 'hidden',
      marginTop: 3,
  },
  budgetImpactBarFill: {
      height: '100%',
      borderRadius: 3,
  },

  // --- Configurações ---
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  togglePassword: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  settingLabel: {
    fontSize: 16,
  },
  budgetInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 15,
  },
  budgetInput: {
      flex: 1,
      marginRight: 10,
  },
  budgetSaveButton: {
      paddingVertical: 10,
      paddingHorizontal: 15,
      borderRadius: 8,
      alignItems: 'center',
  },
  
  // --- Nav de Protótipo Rápido ---
  quickNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    marginTop: 20,
    marginBottom: 40,
    borderTopWidth: 1,
  },
  quickNavButton: {
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  quickNavText: {
    fontSize: 12,
  },

  // --- Estilos Categoria (Lista Vertical) ---
  categoryListContainer: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 5,
  },
  categoryListItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 15,
  },
  categoryButtonTextList: {
    fontSize: 16,
    flex: 1,
  },
  checkMark: {
      fontSize: 20,
      fontWeight: 'bold',
  },

  // --- Estilos Lista de Gastos ---
  expenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    paddingHorizontal: 15,
  },
  expenseDetails: {
    flex: 1,
    marginLeft: 10,
  },
  expenseName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  expenseCategory: {
    fontSize: 12,
  },
  expenseActions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      minWidth: 100,
  },
  expenseValue: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 15,
  },
  deleteButton: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
  },
  deleteButtonText: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: 12,
  }
});

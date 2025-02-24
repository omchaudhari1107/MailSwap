import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Button } from 'react-native-paper';
import { COLORS, SPACING } from '../constants/theme';

export default function AIResponseCard({ response, onSelect }) {
  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text style={styles.title}>{response.type}</Text>
        <Text style={styles.content}>{response.content}</Text>
      </Card.Content>
      <Card.Actions>
        <Button onPress={() => onSelect(response)}>Select</Button>
      </Card.Actions>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
  },
  content: {
    fontSize: 14,
    color: COLORS.secondaryText,
  },
}); 
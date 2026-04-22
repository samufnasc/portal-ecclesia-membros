import { Member } from '../types';

export const membersData: Member[] = [
  { id: '1', name: 'Pr. Sirrenuk', birthday: '05/jan', month: 'Janeiro', day: 5, departments: ['Liderança'], isLeadership: true, baptismDate: '1985-05-20', membershipType: 'Batizado' },
  { id: '2', name: 'Samuel Nascimento', birthday: '22/nov', month: 'Novembro', day: 22, departments: ['Obreiros'], isLeadership: true, baptismDate: '2010-11-15', marriageDate: '2015-06-12', membershipType: 'Batizado' },
  { id: '3', name: 'Raylany Araújo', birthday: '22/ago', month: 'Agosto', day: 22, departments: ['Obreiros'], isLeadership: true, baptismDate: '2012-08-10', marriageDate: '2015-06-12', membershipType: 'Batizado' },
  { id: '4', name: 'Sebastiana Bezerra', birthday: '04/ago', month: 'Agosto', day: 4, departments: ['Congregação'], isLeadership: false, membershipType: 'Batizado' },
  { id: '5', name: 'Karoline Poubel', birthday: '25/out', month: 'Outubro', day: 25, departments: ['EBD'], isLeadership: true, baptismDate: '2015-10-20', membershipType: 'Batizado' },
  { id: '6', name: 'Vitória Caroline', birthday: '21/fev', month: 'Fevereiro', day: 21, departments: ['EBD'], isLeadership: true, baptismDate: '2018-02-15', membershipType: 'Batizado' },
  { id: '7', name: 'Estevão Oliveira', birthday: '14/jul', month: 'Julho', day: 14, departments: ['Congregação'], isLeadership: false, membershipType: 'Congregado' },
  { id: '8', name: 'Ester Oliveira', birthday: '19/fev', month: 'Fevereiro', day: 19, departments: ['Congregação'], isLeadership: false, membershipType: 'Congregado' },
  { id: '9', name: 'Marlene', birthday: '16/jan', month: 'Janeiro', day: 16, departments: ['Secretaria'], isLeadership: true, baptismDate: '1995-01-10', membershipType: 'Batizado' },
  { id: '10', name: 'Maria José', birthday: '07/jan', month: 'Janeiro', day: 7, departments: ['Congregação'], isLeadership: false, membershipType: 'Batizado' },
  { id: '11', name: 'Francisca Melo', birthday: '11/fev', month: 'Fevereiro', day: 11, departments: ['Círculo de Oração'], isLeadership: true, baptismDate: '1990-02-05', membershipType: 'Batizado' },
  { id: '12', name: 'Malvina', birthday: '18/fev', month: 'Fevereiro', day: 18, departments: ['Congregação'], isLeadership: false, membershipType: 'Batizado' },
  { id: '13', name: 'Helena', birthday: '19/jun', month: 'Junho', day: 19, departments: ['Mocidade'], isLeadership: false, membershipType: 'Congregado' },
  { id: '14', name: 'Rosália', birthday: '17/jul', month: 'Julho', day: 17, departments: ['Missão/Assistência Social'], isLeadership: true, baptismDate: '2000-07-15', membershipType: 'Batizado' },
  { id: '15', name: 'Virgínia', birthday: '17/jul', month: 'Julho', day: 17, departments: ['Mídia'], isLeadership: true, baptismDate: '2005-07-20', membershipType: 'Batizado' },
  { id: '16', name: 'Lila', birthday: '18/ago', month: 'Agosto', day: 18, departments: ['Sonoplastia'], isLeadership: true, baptismDate: '2010-08-25', membershipType: 'Batizado' },
  { id: '17', name: 'Ana', birthday: '02/nov', month: 'Novembro', day: 2, departments: ['Congregação'], isLeadership: false, membershipType: 'Visitante' },
  { id: '18', name: 'Edna', birthday: '12/nov', month: 'Novembro', day: 12, departments: ['Congregação'], isLeadership: false, membershipType: 'Visitante' },
  { id: '19', name: 'Aurora Araújo', birthday: '21/jun', month: 'Junho', day: 21, departments: ['Congregação'], isLeadership: false, membershipType: 'Batizado' },
  { id: '20', name: 'Pr. Edgar melo', birthday: '10/ago', month: 'Agosto', day: 10, departments: ['EBD', 'Família'], isLeadership: true, baptismDate: '1980-08-15', membershipType: 'Batizado' },
  { id: '21', name: 'Victor Emanoel', birthday: '29/nov', month: 'Novembro', day: 29, departments: ['Mocidade'], isLeadership: true, membershipType: 'Batizado' },
  { id: '22', name: 'Nayra', birthday: '25/jul', month: 'Julho', day: 25, departments: ['EBD'], isLeadership: true, membershipType: 'Batizado' },
  { id: '23', name: 'Mariana', birthday: '11/abr', month: 'Abril', day: 11, departments: ['Mídia'], isLeadership: true, membershipType: 'Congregado' },
  { id: '24', name: 'Miguel', birthday: '11/mai', month: 'Maio', day: 11, departments: ['Congregação'], isLeadership: false, membershipType: 'Visitante' },
  { id: '25', name: 'Missionária Lia', birthday: '01/jun', month: 'Junho', day: 1, departments: ['Secretaria'], isLeadership: true, membershipType: 'Batizado' },
  { id: '26', name: 'Vanessa', birthday: '03/jan', month: 'Janeiro', day: 3, departments: ['EBD'], isLeadership: true, baptismDate: '2012-01-05', membershipType: 'Batizado' },
  { id: '27', name: 'Wesley', birthday: '03/fev', month: 'Fevereiro', day: 3, departments: ['Sonoplastia'], isLeadership: true, baptismDate: '2015-02-10', membershipType: 'Batizado' },
  { id: '28', name: 'Lucas Israel', birthday: '15/jun', month: 'Junho', day: 15, departments: ['Sonoplastia'], isLeadership: true, baptismDate: '2016-06-15', membershipType: 'Batizado' },
  { id: '29', name: 'Evelyn', birthday: '11/fev', month: 'Fevereiro', day: 11, departments: ['Círculo de Oração'], isLeadership: true, membershipType: 'Batizado' },
];

export const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const DEPARTMENTS = [
  'Liderança', 'Obreiros', 'Secretaria', 'EBD', 'Ministério de Louvor', 
  'Sonoplastia', 'Missão/Assistência Social', 'Mídia', 'Círculo de Oração', 
  'Mocidade', 'Família', 'Congregação'
];

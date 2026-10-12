import { routineFixture } from '../dashboard/fixtures.test-helper';
import { initialValues, routineChanges, routineFormSchema, toRoutinePayload } from './form-model';
it('edição preserva passos multiline, cargo, data e campos opcionais', () => {
  const routine = routineFixture({ specificDate: '2027-02-01', defaultPosition: 'ASSESSOR_CHEFE', frequencyDetails: 'Conforme agenda', essentialForTransition: true, steps: ['Primeiro\ncom orientação', 'Segundo'] });
  const values = initialValues(routine); expect(values.specificDate).toBe('01/02/2027'); const payload = toRoutinePayload(values);
  expect(payload.steps).toEqual(routine.steps); expect(payload.specificDate).toBe(routine.specificDate); expect(routineChanges(routine, payload)).toBeNull();
});
it('alterar título gera PATCH mínimo e limpar opcionais envia null', () => {
  const routine = routineFixture({ specificDate: '2027-02-01', defaultPosition: 'APOIO' }); const values = initialValues(routine);
  values.title = 'Novo título'; expect(routineChanges(routine, toRoutinePayload(values))).toEqual({ title: 'Novo título' });
  values.specificDate = ''; values.defaultPosition = ''; expect(routineChanges(routine, toRoutinePayload(values))).toEqual({ title: 'Novo título', specificDate: null, defaultPosition: null });
});
it('valida frequência personalizada, data impossível e passos vazios usando shared', () => {
  const values = initialValues(routineFixture()); values.frequency = 'PERSONALIZADA'; values.frequencyDetails = '';
  expect(routineFormSchema.safeParse(values).success).toBe(false); values.frequencyDetails = 'A cada dois dias'; values.specificDate = '30/02/2027';
  expect(routineFormSchema.safeParse(values).success).toBe(false); values.specificDate = ''; values.steps = [{ text: '' }];
  const result = routineFormSchema.safeParse(values); expect(result.success).toBe(false);
  if (result.success) throw new Error('Passo inválido aceito.'); expect(result.error.issues[0]?.path).toEqual(['steps', 0, 'text']);
});

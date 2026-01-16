
async def update_consecutivos_for_month_task(month: str, year: int):
    """
    Actualiza estados para un mes y año específicos (accionado manualmente).
    """
    global CONSECUTIVOS_ESTADOS
    
    try:
        print(f"[MANUAL-UPDATE] Iniciando actualización para {month} {year}...")
        df = get_consecutivos_pendientes_dataframe()
        
        # Mapeo de meses para filtro
        month_map = {
            'ENERO': 1, 'FEBRERO': 2, 'MARZO': 3, 'ABRIL': 4, 'MAYO': 5, 'JUNIO': 6,
            'JULIO': 7, 'AGOSTO': 8, 'SEPTIEMBRE': 9, 'OCTUBRE': 10, 'NOVIEMBRE': 11, 'DICIEMBRE': 12,
            'ENE': 1, 'FEB': 2, 'MAR': 3, 'ABR': 4, 'MAY': 5, 'JUN': 6,
            'JUL': 7, 'AGO': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DIC': 12
        }
        
        target_month_num = month_map.get(month.upper())
        if not target_month_num:
             print(f"[MANUAL-UPDATE] Error: Mes inválido {month}")
             return

        def is_target_month(row):
            try:
                y = int(row['AÑO'])
                m = int(row['MES'])
                return y == year and m == target_month_num
            except:
                return False

        # Aplicar filtro
        df_target = df[df.apply(is_target_month, axis=1)]
        
        print(f"[MANUAL-UPDATE] Registros encontrados para {month} {year}: {len(df_target)}")
        
        count = 0
        
        for _, row in df_target.iterrows():
            consecutivo = str(row['Consecutivo'])
            if consecutivo and consecutivo != '0':
                 # Siempre actualizar en manual update, o solo si falta? 
                 # Usualmente manual force update intenta actualizar todo.
                 # Pero para no saturar, podemos checkear si ya tenemos un estado final?
                 # El usuario quiere "Actualizar", asumamos que quiere revisar todos.
                try:
                    estado = consultar_estado_consecutivo(consecutivo)
                    CONSECUTIVOS_ESTADOS[consecutivo] = estado
                    count += 1
                    
                    if count % 5 == 0:
                        save_estados(CONSECUTIVOS_ESTADOS)
                        await asyncio.sleep(0.5)
                except Exception as e:
                    print(f"[MANUAL-UPDATE] Error {consecutivo}: {e}")
                
                await asyncio.sleep(0.2)
        
        save_estados(CONSECUTIVOS_ESTADOS)
        print(f"[MANUAL-UPDATE] Finalizado. {count} estados actualizados.")

    except Exception as e:
        print(f"[MANUAL-UPDATE] Error crítico: {e}")

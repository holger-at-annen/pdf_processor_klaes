from PyPDF2 import PdfReader
import sys
import os
import logging
import argparse
import re
from operator import itemgetter
import pandas as pd

def log_exit(reason):
    logging.info(reason)
    logging.info('-- Exiting...')
    sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description='Process PDF wood list to sorted Excel.')
    parser.add_argument('input_file', help='Path to the input PDF file')
    parser.add_argument('--output', help='Path to the output Excel file (optional)', default=None)
    args = parser.parse_args()

    logging.basicConfig(format='%(message)s', level=logging.DEBUG)
    logging.info('-- Starting...')

    content_file = args.input_file
    logging.info(f'Input file path: {content_file}')

    # Validate file extension
    if not content_file.lower().endswith('.pdf'):
        logging.info(f'File extension check failed: {content_file}')
        log_exit('Error: Given file does not have a .pdf extension.')

    if args.output is None:
        output_dir = os.path.dirname(content_file)
        # Extract base name without timestamp prefix (e.g., '1755773046270_Holzbestellliste Holz Rustikal.pdf' -> 'Holzbestellliste Holz Rustikal')
        base_name = os.path.basename(content_file)
        # Remove timestamp prefix if present (e.g., '1755773046270_')
        if '_' in base_name and base_name.split('_')[0].isdigit():
            base_name = '_'.join(base_name.split('_')[1:])
        # Remove .pdf extension and add .xlsx
        output_file = os.path.join(output_dir, base_name[:-4] + '.xlsx')
    else:
        output_file = args.output

    logging.info('Input file: ' + content_file)
    logging.info('Output file: ' + output_file)

    logging.info('Reading PDF:')

    pdftext = []
    try:
        logging.info('Reading: {}'.format(content_file))
        with open(content_file, 'rb') as f:
            reader = PdfReader(f)
            logging.info(f'PDF has {len(reader.pages)} pages')
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    pdftext.append(text)
                else:
                    logging.warning(f'No text extracted from page in {content_file}')
    except Exception as e:
        log_exit(f'Error reading PDF file: {str(e)}')

    if not pdftext:
        log_exit('Error: No text could be extracted from the PDF.')

    logging.info('Splitting data into datasets...')
    result_trim_list = []
    for page in pdftext:
        pagelines = page.split('\n')
        header_start = 0
        header_end = 0
        result_trim = []

        for i in range(len(pagelines)):
            if '****** ANNEN' in pagelines[i]:
                header_start = i
            if '********************' in pagelines[i]:
                header_end = i
        
        pagelines = pagelines[:header_start] + pagelines[header_end+2:]
        for line in pagelines:
            if '--------------------------------' not in line and '________________________________' not in line:
                result_trim.append(line)
        
        for line in result_trim:
            cleaned_line = re.sub(r'\s+', ' ', line).replace(' +', '+').split()
            if cleaned_line:  # Skip empty lines
                result_trim_list.append(cleaned_line)

    logging.info('Sorting datasets...')
    def sort_key(x):
        try:
            return tuple(map(int, itemgetter(6, 5, 4)(x)))
        except (IndexError, ValueError):
            return (float('inf'), float('inf'), float('inf'))  # Handle malformed lines gracefully

    result_list = sorted(result_trim_list, key=sort_key)

    for i in result_list:
        logging.info(i)

    # Extract fields with correct index checks
    logging.info('Converting datasets to a dictionary...')
    pd_type = []
    pd_desc = []
    pd_pos = []
    pd_amount = []
    pd_len = []
    pd_width = []
    pd_thickness = []
    pd_extra = []

    for dataset in result_list:
        pd_type.append(dataset[0] if len(dataset) > 0 else '')
        pd_desc.append(dataset[1] if len(dataset) > 1 else '')
        pd_pos.append(dataset[2] if len(dataset) > 2 else '')
        pd_amount.append(dataset[3] if len(dataset) > 3 else '')
        pd_len.append(dataset[4] if len(dataset) > 4 else '')
        pd_width.append(dataset[5] if len(dataset) > 5 else '')
        pd_thickness.append(dataset[6] if len(dataset) > 6 else '')
        pd_extra.append(dataset[7] if len(dataset) > 7 else '')

    pd_columns = ['Holz', 'Bezeichnung', 'Position', 'Stueck', 'Laenge', 'Breite', 'Dicke', 'Bemerkung']
    pd_data = [pd_type, pd_desc, pd_pos, pd_amount, pd_len, pd_width, pd_thickness, pd_extra]
    data_dict = dict(zip(pd_columns, pd_data))

    df = pd.DataFrame(data_dict)

    logging.info('Writing pandas dataframe to {}'.format(output_file))
    try:
        df.to_excel(output_file, index=False)
    except Exception as e:
        log_exit('Error writing Excel file: {}'.format(e))

    logging.info('-- Done!')

if __name__ == '__main__':
    main()

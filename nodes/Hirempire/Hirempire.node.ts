import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

const BASE_URL = 'https://api.hirempire.com/v1';

export class Hirempire implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Hirempire',
		name: 'hirempire',
		icon: 'file:hirempire.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Manage jobs, applicants and companies in Hirempire',
		defaults: {
			name: 'Hirempire',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'hirempireApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Applicant', value: 'applicant' },
					{ name: 'Company', value: 'company' },
					{ name: 'Job', value: 'job' },
				],
				default: 'job',
			},

			// ----------------------------------
			//            Job operations
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['job'] } },
				options: [
					{
						name: 'Create',
						value: 'create',
						action: 'Create a job',
						description: 'Create a new job posting',
					},
					{
						name: 'Delete',
						value: 'delete',
						action: 'Delete a job',
						description: 'Delete a job posting',
					},
					{
						name: 'Get',
						value: 'get',
						action: 'Get a job',
						description: 'Retrieve a single job by ID',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						action: 'Get many jobs',
						description: 'Retrieve many jobs',
					},
					{
						name: 'Update Status',
						value: 'updateStatus',
						action: 'Update job status',
						description: 'Update the status of a job',
					},
				],
				default: 'getAll',
			},

			// ----------------------------------
			//          Applicant operations
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['applicant'] } },
				options: [
					{
						name: 'Get',
						value: 'get',
						action: 'Get an applicant',
						description: 'Retrieve a single applicant by ID',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						action: 'Get many applicants',
						description: 'Retrieve many applicants',
					},
					{
						name: 'Get Many by Job',
						value: 'getByJob',
						action: 'Get many applicants by job',
						description: 'Retrieve all applicants for a specific job',
					},
					{
						name: 'Update Status',
						value: 'updateStatus',
						action: 'Update applicant status',
						description: 'Update the status of an applicant',
					},
				],
				default: 'getAll',
			},

			// ----------------------------------
			//           Company operations
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['company'] } },
				options: [
					{
						name: 'Create',
						value: 'create',
						action: 'Create a company',
						description: 'Create a new company',
					},
				],
				default: 'create',
			},

			// ----------------------------------
			//          Job: shared ID field
			// ----------------------------------
			{
				displayName: 'Job ID',
				name: 'jobId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['job'],
						operation: ['get', 'delete', 'updateStatus'],
					},
				},
				description: 'The unique identifier of the job',
			},

			// ----------------------------------
			//          Job: create fields
			// ----------------------------------
			{
				displayName: 'Company ID',
				name: 'companyId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['job'], operation: ['create'] } },
				description: 'The unique identifier of the company the job belongs to',
			},
			{
				displayName: 'Job Title',
				name: 'jobTitle',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['job'], operation: ['create'] } },
			},
			{
				displayName: 'Department',
				name: 'department',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['job'], operation: ['create'] } },
				description: 'The department for the job (e.g. Engineering, Sales, HR)',
			},
			{
				displayName: 'Job Country',
				name: 'jobCountry',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['job'], operation: ['create'] } },
			},
			{
				displayName: 'Salary',
				name: 'salary',
				type: 'number',
				required: true,
				default: 0,
				displayOptions: { show: { resource: ['job'], operation: ['create'] } },
			},
			{
				displayName: 'Currency',
				name: 'currency',
				type: 'string',
				required: true,
				default: 'USD',
				displayOptions: { show: { resource: ['job'], operation: ['create'] } },
				description: 'Three-letter currency code (e.g. USD, EUR, GBP)',
			},
			{
				displayName: 'Salary Period',
				name: 'salaryPeriod',
				type: 'options',
				required: true,
				default: 'Per year',
				displayOptions: { show: { resource: ['job'], operation: ['create'] } },
				options: [
					{ name: 'Bi-Weekly', value: 'Bi-weekly' },
					{ name: 'Per Day', value: 'Per day' },
					{ name: 'Per Hour', value: 'Per hour' },
					{ name: 'Per Month', value: 'Per month' },
					{ name: 'Per Week', value: 'Per week' },
					{ name: 'Per Year', value: 'Per year' },
				],
			},
			{
				displayName: 'Job Type',
				name: 'jobType',
				type: 'options',
				required: true,
				default: 'Full-time',
				displayOptions: { show: { resource: ['job'], operation: ['create'] } },
				options: [
					{ name: 'Contract', value: 'Contract' },
					{ name: 'Freelance', value: 'Freelance' },
					{ name: 'Full-Time', value: 'Full-time' },
					{ name: 'Internship', value: 'Internship' },
					{ name: 'Part-Time', value: 'Part-time' },
					{ name: 'Project-Based', value: 'Project-based' },
					{ name: 'Temporary', value: 'Temporary' },
				],
			},
			{
				displayName: 'Workplace',
				name: 'workplace',
				type: 'options',
				required: true,
				default: 'Remote',
				displayOptions: { show: { resource: ['job'], operation: ['create'] } },
				options: [
					{ name: 'Hybrid', value: 'Hybrid' },
					{ name: 'On-Site', value: 'On-site' },
					{ name: 'Remote', value: 'Remote' },
				],
			},
			{
				displayName: 'Career Level',
				name: 'careerLevel',
				type: 'options',
				required: true,
				default: 'Mid-level',
				displayOptions: { show: { resource: ['job'], operation: ['create'] } },
				options: [
					{ name: 'C-Level', value: 'C-level' },
					{ name: 'Director', value: 'Director' },
					{ name: 'Junior', value: 'Junior' },
					{ name: 'Manager', value: 'Manager' },
					{ name: 'Mid-Level', value: 'Mid-level' },
					{ name: 'Senior', value: 'Senior' },
					{ name: 'Team Leader', value: 'Team Leader' },
					{ name: 'VP', value: 'VP' },
				],
			},
			{
				displayName: 'Job Description',
				name: 'jobDescription',
				type: 'string',
				required: true,
				default: '',
				typeOptions: { rows: 4 },
				displayOptions: { show: { resource: ['job'], operation: ['create'] } },
			},
			{
				displayName: 'Job Sources',
				name: 'jobSources',
				type: 'multiOptions',
				required: true,
				default: [],
				displayOptions: { show: { resource: ['job'], operation: ['create'] } },
				description: 'Where the job will be posted / sourced from',
				options: [
					{ name: 'Company Website', value: 'Company Website' },
					{ name: 'Facebook', value: 'Facebook' },
					{ name: 'Indeed', value: 'Indeed' },
					{ name: 'LinkedIn', value: 'LinkedIn' },
					{ name: 'Referral', value: 'Referral' },
					{ name: 'X (Twitter)', value: 'X' },
				],
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['job'], operation: ['create'] } },
				options: [
					{
						displayName: 'City',
						name: 'city',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Hide Salary',
						name: 'hide_salary',
						type: 'boolean',
						default: false,
						description: 'Whether to hide the salary on the public job posting',
					},
					{
						displayName: 'Status',
						name: 'status',
						type: 'options',
						default: 'Pending',
						options: [
							{ name: 'Active', value: 'Active' },
							{ name: 'Closed', value: 'Closed' },
							{ name: 'Hired', value: 'Hired' },
							{ name: 'Paused', value: 'Paused' },
							{ name: 'Pending', value: 'Pending' },
						],
					},
				],
			},

			// ----------------------------------
			//        Job: update status field
			// ----------------------------------
			{
				displayName: 'Status',
				name: 'jobStatus',
				type: 'options',
				required: true,
				default: 'Active',
				displayOptions: {
					show: { resource: ['job'], operation: ['updateStatus'] },
				},
				options: [
					{ name: 'Active', value: 'Active' },
					{ name: 'Closed', value: 'Closed' },
					{ name: 'Hired', value: 'Hired' },
					{ name: 'Paused', value: 'Paused' },
					{ name: 'Pending', value: 'Pending' },
				],
			},

			// ----------------------------------
			//          Applicant: ID fields
			// ----------------------------------
			{
				displayName: 'Applicant ID',
				name: 'applicantId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: { resource: ['applicant'], operation: ['get', 'updateStatus'] },
				},
				description: 'The unique identifier of the applicant',
			},
			{
				displayName: 'Job ID',
				name: 'applicantJobId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: { resource: ['applicant'], operation: ['getByJob'] },
				},
				description: 'The unique identifier of the job to list applicants for',
			},
			{
				displayName: 'Status',
				name: 'applicantStatus',
				type: 'options',
				required: true,
				default: 'Reviewed',
				displayOptions: {
					show: { resource: ['applicant'], operation: ['updateStatus'] },
				},
				options: [
					{ name: 'Accepted', value: 'Accepted' },
					{ name: 'Applied', value: 'Applied' },
					{ name: 'Hired', value: 'Hired' },
					{ name: 'Met', value: 'Met' },
					{ name: 'Rejected', value: 'Rejected' },
					{ name: 'Reviewed', value: 'Reviewed' },
					{ name: 'Scheduled', value: 'Scheduled' },
				],
			},

			// ----------------------------------
			//          Company: create fields
			// ----------------------------------
			{
				displayName: 'Company Name',
				name: 'companyName',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['company'], operation: ['create'] } },
			},
			{
				displayName: 'Company Domain',
				name: 'companyDomain',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'example.com',
				displayOptions: { show: { resource: ['company'], operation: ['create'] } },
				description: 'The domain of the company',
			},
			{
				displayName: 'Company Logo URL',
				name: 'companyLogoUrl',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['company'], operation: ['create'] } },
				description: 'A URL pointing to the company logo image',
			},
		],
		usableAsTool: true,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				let method: IHttpRequestMethods = 'GET';
				let endpoint = '';
				const qs: IDataObject = {};
				let body: IDataObject = {};
				// Property of the response holding an array we want to spread into items
				let arrayProperty: string | undefined;

				if (resource === 'job') {
					if (operation === 'getAll') {
						method = 'GET';
						endpoint = '/jobs';
						arrayProperty = 'jobs';
					} else if (operation === 'get') {
						method = 'GET';
						endpoint = '/get-job';
						qs.job_id = this.getNodeParameter('jobId', i) as string;
						arrayProperty = 'job';
					} else if (operation === 'create') {
						method = 'POST';
						endpoint = '/add-job';
						const additionalFields = this.getNodeParameter(
							'additionalFields',
							i,
						) as IDataObject;
						body = {
							company_id: this.getNodeParameter('companyId', i) as string,
							job_title: this.getNodeParameter('jobTitle', i) as string,
							department: this.getNodeParameter('department', i) as string,
							job_country: this.getNodeParameter('jobCountry', i) as string,
							salary: this.getNodeParameter('salary', i) as number,
							currency: this.getNodeParameter('currency', i) as string,
							salary_period: this.getNodeParameter('salaryPeriod', i) as string,
							job_type: this.getNodeParameter('jobType', i) as string,
							workplace: this.getNodeParameter('workplace', i) as string,
							career_level: this.getNodeParameter('careerLevel', i) as string,
							job_description: this.getNodeParameter('jobDescription', i) as string,
							job_sources: this.getNodeParameter('jobSources', i) as string[],
							...additionalFields,
						};
					} else if (operation === 'updateStatus') {
						method = 'PATCH';
						endpoint = '/update-job';
						body = {
							job_id: this.getNodeParameter('jobId', i) as string,
							status: this.getNodeParameter('jobStatus', i) as string,
						};
					} else if (operation === 'delete') {
						method = 'DELETE';
						endpoint = '/delete-job';
						qs.job_id = this.getNodeParameter('jobId', i) as string;
					}
				} else if (resource === 'applicant') {
					if (operation === 'getAll') {
						method = 'GET';
						endpoint = '/applicants';
						arrayProperty = 'applicants';
					} else if (operation === 'get') {
						method = 'GET';
						endpoint = '/get-applicant';
						qs.applicant_id = this.getNodeParameter('applicantId', i) as string;
						arrayProperty = 'applicant';
					} else if (operation === 'getByJob') {
						method = 'GET';
						endpoint = '/job-applicants';
						qs.job_id = this.getNodeParameter('applicantJobId', i) as string;
						arrayProperty = 'applicants';
					} else if (operation === 'updateStatus') {
						method = 'PATCH';
						endpoint = '/update-applicant';
						body = {
							applicant_id: this.getNodeParameter('applicantId', i) as string,
							status: this.getNodeParameter('applicantStatus', i) as string,
						};
					}
				} else if (resource === 'company') {
					if (operation === 'create') {
						method = 'POST';
						endpoint = '/create-company';
						body = {
							company_name: this.getNodeParameter('companyName', i) as string,
							company_domain: this.getNodeParameter('companyDomain', i) as string,
							company_logo_url: this.getNodeParameter('companyLogoUrl', i) as string,
						};
					}
				}

				if (!endpoint) {
					throw new NodeOperationError(
						this.getNode(),
						`The operation "${operation}" is not supported for resource "${resource}"`,
						{ itemIndex: i },
					);
				}

				const options: IHttpRequestOptions = {
					method,
					url: `${BASE_URL}${endpoint}`,
					json: true,
				};
				if (Object.keys(qs).length) options.qs = qs;
				if (Object.keys(body).length) options.body = body;

				const responseData = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					'hirempireApi',
					options,
				)) as IDataObject;

				if (
					arrayProperty &&
					responseData &&
					Array.isArray(responseData[arrayProperty])
				) {
					const records = responseData[arrayProperty] as IDataObject[];
					for (const record of records) {
						returnData.push({
							json: record,
							pairedItem: { item: i },
						});
					}
				} else {
					returnData.push({
						json: responseData,
						pairedItem: { item: i },
					});
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
